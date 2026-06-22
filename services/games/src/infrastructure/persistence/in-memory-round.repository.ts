import { Injectable } from "@nestjs/common";
import type {
  CompletedRoundRecord,
  LeaderboardEntry,
  LeaderboardMetric,
  PlayerBetHistoryEntry,
  RoundHistorySummary,
  RoundRepository,
} from "../../application/ports/game-ports";
import {
  toLeaderboard,
  toPlayerBetHistory,
  toRoundHistorySummary,
} from "../../application/round-read-models";
import type { CompletedRoundSnapshot } from "../../application/round-read-models";
import {
  nonceForRound,
  serverSeedForRound,
} from "../../application/round-seed";
import {
  CrashPoint,
  ProvablyFair,
  Round,
} from "../../domain";
import type { RoundSnapshot } from "../../domain";

@Injectable()
export class InMemoryRoundRepository implements RoundRepository {
  private currentRound: Round;
  private readonly completedRounds: CompletedRoundRecord[] = [];
  private readonly historicalSnapshots: RoundSnapshot[] = [];
  private roundSequence = 1;

  constructor() {
    this.currentRound = this.createRound();
  }

  async getCurrent(): Promise<Round> {
    return this.currentRound;
  }

  async getActive(): Promise<Round[]> {
    return this.currentRound.status === "settled" ? [] : [this.currentRound];
  }

  async saveCurrent(round: Round): Promise<void> {
    this.currentRound = round;
  }

  async createNext(): Promise<Round> {
    this.historicalSnapshots.push(this.currentRound.toSnapshot());
    this.currentRound = this.createRound();
    return this.currentRound;
  }

  async addCompleted(round: CompletedRoundRecord): Promise<void> {
    this.completedRounds.push(round);
  }

  async getHistory(limit: number): Promise<CompletedRoundRecord[]> {
    return this.completedRounds.slice(-limit).reverse();
  }

  async getCompleted(roundId: string): Promise<CompletedRoundRecord | undefined> {
    return this.completedRounds.find((round) => round.id === roundId);
  }

  async getPlayerRoundSnapshots(playerId: string, limit: number): Promise<RoundSnapshot[]> {
    const snapshots = [...this.historicalSnapshots, this.currentRound.toSnapshot()];
    return snapshots
      .filter((round) => round.bets.some((bet) => bet.playerId === playerId))
      .slice(-limit)
      .reverse();
  }

  async getRoundHistorySummaries(limit: number): Promise<RoundHistorySummary[]> {
    return this.completedSnapshots()
      .sort((left, right) =>
        Date.parse(right.completed.crashedAt) - Date.parse(left.completed.crashedAt)
      )
      .slice(0, limit)
      .map((input) => toRoundHistorySummary(input));
  }

  async getLeaderboard(
    limit: number,
    metric: LeaderboardMetric,
  ): Promise<LeaderboardEntry[]> {
    return toLeaderboard(this.completedSnapshots(), limit, metric);
  }

  async getPlayerBetHistory(
    playerId: string,
    limit: number,
  ): Promise<PlayerBetHistoryEntry[]> {
    const completedByRoundId = new Map(this.completedRounds.map((round) => [round.id, round]));
    const snapshots = [...this.historicalSnapshots, this.currentRound.toSnapshot()]
      .reverse()
      .map((round) => ({ round, completed: completedByRoundId.get(round.id) }));

    return toPlayerBetHistory(snapshots, playerId, limit);
  }

  private createRound(): Round {
    const id = `round-${this.roundSequence++}`;
    const fairness = ProvablyFair.createRound(serverSeedForRound(id), nonceForRound(id));
    return new Round(
      id,
      CrashPoint.fromBasisPoints(fairness.crashPoint.multiplierBps),
      fairness.serverSeedHash,
      fairness.nonce,
    );
  }

  private completedSnapshots(): CompletedRoundSnapshot[] {
    const snapshots = [...this.historicalSnapshots, this.currentRound.toSnapshot()];

    return this.completedRounds.flatMap((completed) => {
      const round = snapshots.find((snapshot) => snapshot.id === completed.id);
      return round ? [{ round, completed }] : [];
    });
  }
}

import { Injectable } from "@nestjs/common";
import type {
  CompletedRoundRecord,
  RoundRepository,
} from "../../application/ports/game-ports";
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

  getCurrent(): Round {
    return this.currentRound;
  }

  saveCurrent(round: Round): void {
    this.currentRound = round;
  }

  createNext(): Round {
    this.historicalSnapshots.push(this.currentRound.toSnapshot());
    this.currentRound = this.createRound();
    return this.currentRound;
  }

  addCompleted(round: CompletedRoundRecord): void {
    this.completedRounds.push(round);
  }

  getHistory(limit: number): CompletedRoundRecord[] {
    return this.completedRounds.slice(-limit).reverse();
  }

  getCompleted(roundId: string): CompletedRoundRecord | undefined {
    return this.completedRounds.find((round) => round.id === roundId);
  }

  getPlayerRoundSnapshots(playerId: string, limit: number): RoundSnapshot[] {
    const snapshots = [...this.historicalSnapshots, this.currentRound.toSnapshot()];
    return snapshots
      .filter((round) => round.bets.some((bet) => bet.playerId === playerId))
      .slice(-limit)
      .reverse();
  }

  private createRound(): Round {
    const id = `round-${this.roundSequence++}`;
    const fairness = ProvablyFair.createRound(`server-seed-${id}`, id);
    return new Round(
      id,
      CrashPoint.fromBasisPoints(fairness.crashPoint.multiplierBps),
      fairness.serverSeedHash,
      id,
    );
  }
}

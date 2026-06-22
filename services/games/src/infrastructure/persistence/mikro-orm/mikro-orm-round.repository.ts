import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type {
  CompletedRoundRecord,
  LeaderboardEntry,
  LeaderboardMetric,
  PlayerBetHistoryEntry,
  RoundHistorySummary,
  RoundRepository,
} from "../../../application/ports/game-ports";
import {
  toLeaderboard,
  toPlayerBetHistory,
  toRoundHistorySummary,
} from "../../../application/round-read-models";
import type { CompletedRoundSnapshot } from "../../../application/round-read-models";
import {
  nonceForRound,
  serverSeedForRound,
} from "../../../application/round-seed";
import { ProvablyFair, Round } from "../../../domain";
import type { BetSnapshot, RoundSnapshot } from "../../../domain";
import { BetEntity, RoundEntity } from "./entities";

const FORMULA = {
  commitmentAlgorithm: "sha256" as const,
  crashAlgorithm: "hmac-sha256" as const,
  multiplierScale: "basis_points" as const,
};
const LEADERBOARD_SCAN_LIMIT = 100;

@Injectable()
export class MikroOrmRoundRepository implements RoundRepository {
  constructor(private readonly em: EntityManager) {}

  async getCurrent(): Promise<Round> {
    const em = this.em.fork();
    const entity = await em.findOne(
      RoundEntity,
      { status: { $ne: "settled" } as any },
      { orderBy: { createdAt: "DESC" }, populate: ["bets"] as any },
    );

    if (entity) {
      return this.toDomain(entity);
    }

    return this.createNext();
  }

  async getActive(): Promise<Round[]> {
    const entities = await this.em.fork().find(
      RoundEntity,
      { status: { $ne: "settled" } as any },
      { orderBy: { createdAt: "ASC" }, populate: ["bets"] as any },
    );
    return entities.map((entity) => this.toDomain(entity));
  }

  async saveCurrent(round: Round): Promise<void> {
    const em = this.em.fork();
    const snapshot = round.toSnapshot();
    const now = new Date();
    let entity = await em.findOne(
      RoundEntity,
      { id: snapshot.id },
      { populate: ["bets"] as any },
    );

    if (!entity) {
      entity = new RoundEntity();
      entity.id = snapshot.id;
      entity.createdAt = now;
    }

    const existingBetEntities = await em.find(BetEntity, { round: entity } as any);
    const existingBets = new Map(
      existingBetEntities.map((bet) => [
        bet.id,
        {
          id: bet.id,
          playerId: bet.playerId,
          amountCents: bet.amountCents,
          status: bet.status,
          ready: bet.ready ?? false,
          cashoutMultiplierBps: bet.cashoutMultiplierBps ?? undefined,
          payoutCents: bet.payoutCents ?? undefined,
          autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps ?? undefined,
          cashoutTrigger: bet.cashoutTrigger ?? undefined,
        } satisfies BetSnapshot,
      ]),
    );
    const bets = snapshot.bets.map((bet) => mergeBetSnapshot(existingBets.get(bet.id), bet));

    entity.status = snapshot.status;
    entity.crashMultiplierBps = snapshot.crashMultiplierBps;
    entity.houseEdgeBps = 100;
    entity.serverSeedHash = snapshot.serverSeedHash ?? entity.serverSeedHash ?? "";
    entity.nonce = snapshot.nonce ?? entity.nonce ?? snapshot.id;
    entity.updatedAt = now;
    entity.crashedAt = snapshot.status === "crashed" && !entity.crashedAt ? now : entity.crashedAt;
    entity.settledAt = snapshot.status === "settled" && !entity.settledAt ? now : entity.settledAt;

    await em.persistAndFlush(entity);
    await em.getConnection().execute("delete from bets where round_id = ?", [snapshot.id]);

    if (bets.length === 0) {
      return;
    }

    await em.insertMany(
      BetEntity,
      bets.map((bet) => ({
        id: bet.id,
        round: entity,
        playerId: bet.playerId,
        amountCents: bet.amountCents,
        status: bet.status,
        ready: bet.ready ?? false,
        cashoutMultiplierBps: bet.cashoutMultiplierBps ?? null,
        payoutCents: bet.payoutCents ?? null,
        autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps ?? null,
        cashoutTrigger: bet.cashoutTrigger ?? null,
        walletOperationKey: `bet-debit:${entity.id}:${bet.playerId}`,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  async createNext(): Promise<Round> {
    const id = `round-${Date.now()}`;
    const fairness = ProvablyFair.createRound(serverSeedForRound(id), nonceForRound(id));
    const round = new Round(id, fairness.crashPoint, fairness.serverSeedHash, fairness.nonce);
    await this.saveCurrent(round);
    return round;
  }

  async addCompleted(round: CompletedRoundRecord): Promise<void> {
    const em = this.em.fork();
    const entity = await em.findOne(RoundEntity, { id: round.id });

    if (!entity) {
      return;
    }

    entity.crashMultiplierBps = round.crashMultiplierBps;
    entity.serverSeedHash = round.serverSeedHash;
    entity.serverSeed = round.serverSeed;
    entity.nonce = round.nonce;
    entity.houseEdgeBps = round.houseEdgeBps;
    entity.crashedAt = new Date(round.crashedAt);
    entity.updatedAt = new Date();
    await em.persistAndFlush(entity);
  }

  async getHistory(limit: number): Promise<CompletedRoundRecord[]> {
    const rounds = await this.em.fork().find(
      RoundEntity,
      { serverSeed: { $ne: null } as any },
      { orderBy: { crashedAt: "DESC" }, limit },
    );
    return rounds.map((round) => this.toCompletedRecord(round));
  }

  async getCompleted(roundId: string): Promise<CompletedRoundRecord | undefined> {
    const round = await this.em.fork().findOne(RoundEntity, {
      id: roundId,
      serverSeed: { $ne: null } as any,
    });
    return round ? this.toCompletedRecord(round) : undefined;
  }

  async getPlayerRoundSnapshots(playerId: string, limit: number): Promise<RoundSnapshot[]> {
    const bets = await this.em.fork().find(
      BetEntity,
      { playerId },
      { orderBy: { createdAt: "DESC" }, limit, populate: ["round", "round.bets"] as any },
    );
    return bets.map((bet) => this.toDomain(bet.round).toSnapshot());
  }

  async getRoundHistorySummaries(limit: number): Promise<RoundHistorySummary[]> {
    const rounds = await this.getCompletedRoundEntities(limit);
    return rounds
      .map((round) => toRoundHistorySummary(this.toCompletedSnapshot(round)))
      .sort((left, right) => Date.parse(right.crashedAt) - Date.parse(left.crashedAt));
  }

  async getLeaderboard(
    limit: number,
    metric: LeaderboardMetric,
  ): Promise<LeaderboardEntry[]> {
    const rounds = await this.getCompletedRoundEntities(Math.max(limit, LEADERBOARD_SCAN_LIMIT));
    return toLeaderboard(
      rounds.map((round) => this.toCompletedSnapshot(round)),
      limit,
      metric,
    );
  }

  async getPlayerBetHistory(
    playerId: string,
    limit: number,
  ): Promise<PlayerBetHistoryEntry[]> {
    const bets = await this.em.fork().find(
      BetEntity,
      { playerId },
      {
        orderBy: { createdAt: "DESC" },
        limit,
        populate: ["round", "round.bets"] as any,
      },
    );
    const rounds = bets.map((bet) => ({
      round: this.toDomain(bet.round).toSnapshot(),
      completed: bet.round.serverSeed ? this.toCompletedRecord(bet.round) : undefined,
    }));

    return toPlayerBetHistory(rounds, playerId, limit);
  }

  toDomain(entity: RoundEntity): Round {
    return Round.rehydrate({
      id: entity.id,
      status: entity.status,
      crashMultiplierBps: entity.crashMultiplierBps,
      serverSeedHash: entity.serverSeedHash,
      nonce: entity.nonce,
      bets: [...(entity.bets ?? [])].map((bet) => ({
        id: bet.id,
        playerId: bet.playerId,
        amountCents: bet.amountCents,
        status: bet.status,
        ready: bet.ready ?? false,
        cashoutMultiplierBps: bet.cashoutMultiplierBps ?? undefined,
        payoutCents: bet.payoutCents ?? undefined,
        autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps ?? undefined,
        cashoutTrigger: bet.cashoutTrigger ?? undefined,
      })),
    });
  }

  toCompletedRecord(entity: RoundEntity): CompletedRoundRecord {
    return {
      id: entity.id,
      crashMultiplierBps: entity.crashMultiplierBps,
      serverSeedHash: entity.serverSeedHash,
      serverSeed: entity.serverSeed ?? "",
      nonce: entity.nonce,
      houseEdgeBps: entity.houseEdgeBps,
      formula: FORMULA,
      crashedAt: (entity.crashedAt ?? entity.updatedAt).toISOString(),
    };
  }

  private toEntity(round: Round): RoundEntity {
    const snapshot = round.toSnapshot();
    const now = new Date();
    const entity = new RoundEntity();
    entity.id = snapshot.id;
    entity.status = snapshot.status;
    entity.crashMultiplierBps = snapshot.crashMultiplierBps;
    entity.houseEdgeBps = 100;
    entity.serverSeedHash = snapshot.serverSeedHash ?? "";
    entity.nonce = snapshot.nonce ?? snapshot.id;
    entity.createdAt = now;
    entity.updatedAt = now;
    entity.bets = new Set(
      snapshot.bets.map((bet) => {
        const betEntity = new BetEntity();
        betEntity.id = bet.id;
        betEntity.round = entity;
        betEntity.playerId = bet.playerId;
        betEntity.amountCents = bet.amountCents;
        betEntity.status = bet.status;
        betEntity.ready = bet.ready ?? false;
        betEntity.cashoutMultiplierBps = bet.cashoutMultiplierBps;
        betEntity.payoutCents = bet.payoutCents;
        betEntity.autoCashoutMultiplierBps = bet.autoCashoutMultiplierBps;
        betEntity.cashoutTrigger = bet.cashoutTrigger;
        betEntity.walletOperationKey = `bet-debit:${entity.id}:${bet.playerId}`;
        betEntity.createdAt = now;
        betEntity.updatedAt = now;
        return betEntity;
      }),
    );
    return entity;
  }

  private async getCompletedRoundEntities(limit: number): Promise<RoundEntity[]> {
    return this.em.fork().find(
      RoundEntity,
      { serverSeed: { $ne: null } as any },
      {
        orderBy: { crashedAt: "DESC" },
        limit,
        populate: ["bets"] as any,
      },
    );
  }

  private toCompletedSnapshot(entity: RoundEntity): CompletedRoundSnapshot {
    return {
      round: this.toDomain(entity).toSnapshot(),
      completed: this.toCompletedRecord(entity),
      settledAt: entity.settledAt?.toISOString(),
    };
  }
}

function mergeBetSnapshot(
  existing: BetSnapshot | undefined,
  incoming: BetSnapshot,
): BetSnapshot {
  if (!existing) {
    return incoming;
  }

  return betStatusRank(existing.status) > betStatusRank(incoming.status)
    ? existing
    : incoming;
}

function betStatusRank(status: BetSnapshot["status"]): number {
  if (status === "cashed_out") {
    return 2;
  }

  if (status === "lost") {
    return 1;
  }

  return 0;
}

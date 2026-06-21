import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type {
  CompletedRoundRecord,
  RoundRepository,
} from "../../../application/ports/game-ports";
import {
  nonceForRound,
  serverSeedForRound,
} from "../../../application/round-seed";
import { ProvablyFair, Round } from "../../../domain";
import type { RoundSnapshot } from "../../../domain";
import { BetEntity, RoundEntity } from "./entities";

const FORMULA = {
  commitmentAlgorithm: "sha256" as const,
  crashAlgorithm: "hmac-sha256" as const,
  multiplierScale: "basis_points" as const,
};

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

    entity.status = snapshot.status;
    entity.crashMultiplierBps = snapshot.crashMultiplierBps;
    entity.houseEdgeBps = 100;
    entity.serverSeedHash = snapshot.serverSeedHash ?? entity.serverSeedHash ?? "";
    entity.nonce = snapshot.nonce ?? entity.nonce ?? snapshot.id;
    entity.updatedAt = now;
    entity.crashedAt = snapshot.status === "crashed" && !entity.crashedAt ? now : entity.crashedAt;
    entity.settledAt = snapshot.status === "settled" && !entity.settledAt ? now : entity.settledAt;

    await em.persistAndFlush(entity);
    await em.nativeDelete(BetEntity, { round: entity } as any);

    const bets = snapshot.bets.map((bet) => {
      const betEntity = new BetEntity();
      betEntity.id = bet.id;
      betEntity.round = entity;
      betEntity.playerId = bet.playerId;
      betEntity.amountCents = bet.amountCents;
      betEntity.status = bet.status;
      betEntity.cashoutMultiplierBps = bet.cashoutMultiplierBps;
      betEntity.payoutCents = bet.payoutCents;
      betEntity.walletOperationKey = `bet-debit:${entity.id}:${bet.playerId}`;
      betEntity.createdAt = now;
      betEntity.updatedAt = now;
      return betEntity;
    });

    em.persist(bets);
    await em.flush();
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
        cashoutMultiplierBps: bet.cashoutMultiplierBps ?? undefined,
        payoutCents: bet.payoutCents ?? undefined,
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
        betEntity.cashoutMultiplierBps = bet.cashoutMultiplierBps;
        betEntity.payoutCents = bet.payoutCents;
        betEntity.walletOperationKey = `bet-debit:${entity.id}:${bet.playerId}`;
        betEntity.createdAt = now;
        betEntity.updatedAt = now;
        return betEntity;
      }),
    );
    return entity;
  }
}

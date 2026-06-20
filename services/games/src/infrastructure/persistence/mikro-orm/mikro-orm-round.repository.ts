import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type {
  CompletedRoundRecord,
  RoundRepository,
} from "../../../application/ports/game-ports";
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

  getCurrent(): Round {
    throw new Error("MikroORM runtime wiring is configured in the persistence slice");
  }

  saveCurrent(round: Round): void {
    void this.toEntity(round);
  }

  createNext(): Round {
    const id = `round-${Date.now()}`;
    const fairness = ProvablyFair.createRound(`server-seed-${id}`, id);
    return new Round(id, fairness.crashPoint, fairness.serverSeedHash, fairness.nonce);
  }

  addCompleted(round: CompletedRoundRecord): void {
    void round;
  }

  getHistory(_limit: number): CompletedRoundRecord[] {
    return [];
  }

  getCompleted(_roundId: string): CompletedRoundRecord | undefined {
    return undefined;
  }

  getPlayerRoundSnapshots(_playerId: string, _limit: number): RoundSnapshot[] {
    return [];
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
        cashoutMultiplierBps: bet.cashoutMultiplierBps,
        payoutCents: bet.payoutCents,
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

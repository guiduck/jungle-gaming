import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type {
  WalletOperationRecord,
  WalletOperationRepository,
} from "../../../application/ports/wallet-ports";
import type { Wallet } from "../../../domain";
import { WalletEntity, WalletOperationEntity } from "./entities";

@Injectable()
export class MikroOrmWalletOperationRepository implements WalletOperationRepository {
  constructor(private readonly em: EntityManager) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<WalletOperationRecord | undefined> {
    const entity = await this.em.fork().findOne(
      WalletOperationEntity,
      { idempotencyKey },
      { populate: ["wallet"] as any },
    );
    return entity ? this.toRecord(entity) : undefined;
  }

  async record(operation: WalletOperationRecord): Promise<WalletOperationRecord> {
    const previous = await this.findByIdempotencyKey(operation.idempotencyKey);

    if (previous) {
      return previous;
    }

    const em = this.em.fork();
    const wallet = await em.findOne(WalletEntity, { playerId: operation.playerId });

    if (!wallet) {
      throw new Error(`Cannot record wallet operation for missing wallet ${operation.playerId}`);
    }

    const entity = new WalletOperationEntity();
    entity.id = `wallet-operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    entity.idempotencyKey = operation.idempotencyKey;
    entity.wallet = wallet;
    entity.type = operation.type;
    entity.amountCents = operation.amountCents;
    entity.status = operation.status;
    entity.reason = operation.reason;
    entity.createdAt = new Date(operation.recordedAt);
    await em.persistAndFlush(entity);
    return operation;
  }

  async recordWalletMutation(
    wallet: Wallet,
    operation: WalletOperationRecord,
  ): Promise<WalletOperationRecord> {
    const previous = await this.findByIdempotencyKey(operation.idempotencyKey);

    if (previous) {
      return previous;
    }

    return this.em.fork().transactional(async (em) => {
      const snapshot = wallet.toSnapshot();
      const now = new Date();
      let walletEntity = await em.findOne(WalletEntity, { playerId: snapshot.playerId });

      if (!walletEntity) {
        walletEntity = new WalletEntity();
        walletEntity.id = snapshot.id;
        walletEntity.playerId = snapshot.playerId;
        walletEntity.version = 0;
        walletEntity.createdAt = now;
      }

      walletEntity.balanceCents = snapshot.balanceCents;
      walletEntity.version = (walletEntity.version ?? 0) + 1;
      walletEntity.updatedAt = now;

      const operationEntity = new WalletOperationEntity();
      operationEntity.id = `wallet-operation:${operation.idempotencyKey}`;
      operationEntity.idempotencyKey = operation.idempotencyKey;
      operationEntity.wallet = walletEntity;
      operationEntity.type = operation.type;
      operationEntity.amountCents = operation.amountCents;
      operationEntity.status = operation.status;
      operationEntity.reason = operation.reason;
      operationEntity.createdAt = new Date(operation.recordedAt);

      await em.persist(walletEntity).persist(operationEntity).flush();
      return operation;
    });
  }

  private toRecord(entity: WalletOperationEntity): WalletOperationRecord {
    return {
      idempotencyKey: entity.idempotencyKey,
      playerId: entity.wallet.playerId,
      type: entity.type,
      amountCents: entity.amountCents,
      status: entity.status,
      reason: entity.reason,
      recordedAt: entity.createdAt.toISOString(),
    };
  }
}

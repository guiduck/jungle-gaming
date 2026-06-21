import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type { WalletRepository } from "../../../application/ports/wallet-ports";
import { Money, PlayerId, Wallet } from "../../../domain";
import { WalletEntity } from "./entities";

@Injectable()
export class MikroOrmWalletRepository implements WalletRepository {
  constructor(private readonly em: EntityManager) {}

  async findByPlayerId(playerId: string): Promise<Wallet | undefined> {
    const entity = await this.em.fork().findOne(WalletEntity, { playerId });
    return entity ? this.toDomain(entity) : undefined;
  }

  async save(wallet: Wallet): Promise<void> {
    const em = this.em.fork();
    const snapshot = wallet.toSnapshot();
    const now = new Date();
    let entity = await em.findOne(WalletEntity, { playerId: snapshot.playerId });

    if (!entity) {
      entity = new WalletEntity();
      entity.id = snapshot.id;
      entity.playerId = snapshot.playerId;
      entity.version = 0;
      entity.createdAt = now;
    }

    entity.balanceCents = snapshot.balanceCents;
    entity.version = (entity.version ?? 0) + 1;
    entity.updatedAt = now;
    await em.persistAndFlush(entity);
  }

  private toDomain(entity: WalletEntity): Wallet {
    return new Wallet(
      entity.id,
      PlayerId.from(entity.playerId),
      Money.fromCents(entity.balanceCents),
    );
  }
}

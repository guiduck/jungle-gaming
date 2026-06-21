import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import type { GameMessageReceiptRepository } from "../../../application/ports/game-ports";
import { GameMessageReceiptEntity } from "./entities";

@Injectable()
export class MikroOrmGameMessageReceiptRepository implements GameMessageReceiptRepository {
  constructor(private readonly em: EntityManager) {}

  async has(idempotencyKey: string): Promise<boolean> {
    return (await this.em.fork().count(GameMessageReceiptEntity, { idempotencyKey })) > 0;
  }

  async record(idempotencyKey: string, messageType: string): Promise<void> {
    const em = this.em.fork();
    const existing = await em.findOne(GameMessageReceiptEntity, { idempotencyKey });

    if (existing) {
      return;
    }

    const receipt = new GameMessageReceiptEntity();
    receipt.idempotencyKey = idempotencyKey;
    receipt.messageType = messageType;
    receipt.processedAt = new Date();
    await em.persistAndFlush(receipt);
  }
}

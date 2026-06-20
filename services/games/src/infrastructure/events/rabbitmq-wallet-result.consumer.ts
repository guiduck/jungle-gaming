import * as amqp from "amqplib";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { GameStateService } from "../../application/game-state.service";
import type { WalletEffectResult } from "../../application/ports/game-ports";
import { InMemoryGameMessageReceiptRepository } from "./in-memory-game-message-receipt.repository";

const RESULT_EXCHANGE = "wallet.results";
const RESULT_QUEUE = "wallet.results.games";

@Injectable()
export class RabbitMqWalletResultConsumer implements OnModuleInit, OnModuleDestroy {
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  constructor(
    private readonly gameState: GameStateService,
    private readonly receipts: InMemoryGameMessageReceiptRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.RABBITMQ_CONSUMERS_ENABLED !== "true") {
      return;
    }

    const channel = await this.getChannel();
    await channel.assertExchange(RESULT_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(RESULT_QUEUE, { durable: true });
    await channel.bindQueue(RESULT_QUEUE, RESULT_EXCHANGE, "wallet.*");
    await channel.consume(RESULT_QUEUE, (message) => {
      if (!message) {
        return;
      }

      try {
        const result = JSON.parse(message.content.toString()) as WalletEffectResult;
        if (!this.receipts.has(result.idempotencyKey)) {
          this.receipts.record(result.idempotencyKey);
          this.gameState.handleWalletResult(result);
        }
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://admin:admin@rabbitmq:5672");
    this.channel = await this.connection.createChannel();
    return this.channel;
  }
}

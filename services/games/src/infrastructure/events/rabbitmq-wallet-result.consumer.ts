import * as amqp from "amqplib";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { GameStateService } from "../../application/game-state.service";
import {
  GAME_MESSAGE_RECEIPT_REPOSITORY,
  type GameMessageReceiptRepository,
  type WalletEffectResult,
} from "../../application/ports/game-ports";
import { formatLogEvent } from "../system/log-event";
import { connectRabbitMq } from "./rabbitmq-connection";

const RESULT_EXCHANGE = "wallet.results";
const RESULT_QUEUE = "wallet.results.games";

@Injectable()
export class RabbitMqWalletResultConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqWalletResultConsumer.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  constructor(
    private readonly gameState: GameStateService,
    @Inject(GAME_MESSAGE_RECEIPT_REPOSITORY)
    private readonly receipts: GameMessageReceiptRepository,
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
        void this.handleResult(result)
          .then(() => channel.ack(message))
          .catch((error) => {
            this.logger.error(formatLogEvent("rabbitmq.consume.failed", {
              routingKey: message.fields.routingKey,
              direction: "consume",
              reason: error instanceof Error ? error.message : String(error),
            }));
            channel.nack(message, false, false);
          });
      } catch (error) {
        this.logger.error(formatLogEvent("rabbitmq.consume.parse_failed", {
          routingKey: message.fields.routingKey,
          direction: "consume",
          reason: error instanceof Error ? error.message : String(error),
        }));
        channel.nack(message, false, false);
      }
    });
  }

  private async handleResult(result: WalletEffectResult): Promise<void> {
    if (!(await this.receipts.has(result.idempotencyKey))) {
      await this.receipts.record(result.idempotencyKey, "wallet.result");
      this.logger.log(formatLogEvent("wallet.result.consumed", {
        idempotencyKey: result.idempotencyKey,
        result: result.status,
        reason: result.reason,
      }));
      this.gameState.handleWalletResult(result);
      return;
    }
    this.logger.log(formatLogEvent("wallet.result.duplicate", {
      idempotencyKey: result.idempotencyKey,
      result: result.status,
    }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await connectRabbitMq(this.logger, "games.wallet_result_consumer");
    this.channel = await this.connection.createChannel();
    return this.channel;
  }
}

import * as amqp from "amqplib";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { WalletStateService } from "../../application/wallet-state.service";
import { formatLogEvent } from "../system/log-event";
import { connectRabbitMq } from "./rabbitmq-connection";

const REQUEST_EXCHANGE = "wallet.requests";
const REQUEST_QUEUE = "wallet.requests.wallets";

@Injectable()
export class RabbitMqWalletConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqWalletConsumer.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  constructor(private readonly wallets: WalletStateService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.RABBITMQ_CONSUMERS_ENABLED !== "true") {
      return;
    }

    const channel = await this.getChannel();
    await channel.assertExchange(REQUEST_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(REQUEST_QUEUE, { durable: true });
    await channel.bindQueue(REQUEST_QUEUE, REQUEST_EXCHANGE, "wallet.#");
    await channel.consume(REQUEST_QUEUE, (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString()) as WalletRequestPayload;
        void this.handle(payload)
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

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async handle(payload: WalletRequestPayload): Promise<void> {
    this.logger.log(formatLogEvent("rabbitmq.consume", {
      routingKey: payload.eventName,
      direction: "consume",
      idempotencyKey: payload.idempotencyKey,
      playerId: payload.playerId,
      amountCents: payload.amountCents,
    }));

    if (payload.eventName?.includes("bet_debit")) {
      await this.wallets.debitBet(payload);
      return;
    }

    if (payload.eventName?.includes("payout_credit")) {
      await this.wallets.creditPayout(payload);
      return;
    }

    this.logger.warn(formatLogEvent("rabbitmq.consume.unknown", {
      routingKey: payload.eventName,
      direction: "consume",
      idempotencyKey: payload.idempotencyKey,
    }));
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await connectRabbitMq(this.logger, "wallets.wallet_consumer");
    this.channel = await this.connection.createChannel();
    return this.channel;
  }
}

interface WalletRequestPayload {
  eventName: "wallet.bet_debit_requested" | "wallet.payout_credit_requested";
  idempotencyKey: string;
  playerId: string;
  amountCents: number;
}

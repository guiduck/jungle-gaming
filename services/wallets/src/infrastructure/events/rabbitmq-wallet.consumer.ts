import * as amqp from "amqplib";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { WalletStateService } from "../../application/wallet-state.service";

const REQUEST_EXCHANGE = "wallet.requests";
const REQUEST_QUEUE = "wallet.requests.wallets";

@Injectable()
export class RabbitMqWalletConsumer implements OnModuleInit, OnModuleDestroy {
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
    await channel.bindQueue(REQUEST_QUEUE, REQUEST_EXCHANGE, "wallet.*_requested");
    await channel.consume(REQUEST_QUEUE, (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString()) as WalletRequestPayload;
        this.handle(payload);
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

  private handle(payload: WalletRequestPayload): void {
    if (payload.eventName === "wallet.bet_debit_requested") {
      this.wallets.debitBet(payload);
      return;
    }

    if (payload.eventName === "wallet.payout_credit_requested") {
      this.wallets.creditPayout(payload);
    }
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

interface WalletRequestPayload {
  eventName: "wallet.bet_debit_requested" | "wallet.payout_credit_requested";
  idempotencyKey: string;
  playerId: string;
  amountCents: number;
}

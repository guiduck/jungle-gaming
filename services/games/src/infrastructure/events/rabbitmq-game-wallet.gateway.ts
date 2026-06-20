import * as amqp from "amqplib";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type {
  GameWalletGateway,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../application/ports/game-ports";

const REQUEST_EXCHANGE = "wallet.requests";
const RESULT_EXCHANGE = "wallet.results";
const RESULT_TIMEOUT_MS = Number(process.env.WALLET_RESULT_TIMEOUT_MS ?? 1500);

@Injectable()
export class RabbitMqGameWalletGateway implements GameWalletGateway, OnModuleDestroy {
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    void this.publish("wallet.bet_debit_requested", { ...request });
    return this.timeoutResult(request.idempotencyKey);
  }

  async requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult> {
    void this.publish("wallet.payout_credit_requested", { ...request });
    return this.timeoutResult(request.idempotencyKey);
  }

  async publish(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertExchange(REQUEST_EXCHANGE, "topic", { durable: true });
    channel.publish(
      REQUEST_EXCHANGE,
      eventName,
      Buffer.from(JSON.stringify({ eventName, ...payload })),
      {
        contentType: "application/json",
        persistent: true,
      },
    );
  }

  async recordResult(payload: Record<string, unknown>): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertExchange(RESULT_EXCHANGE, "topic", { durable: true });
    channel.publish(
      RESULT_EXCHANGE,
      String(payload.eventName ?? "wallet.result_recorded"),
      Buffer.from(JSON.stringify(payload)),
      {
        contentType: "application/json",
        persistent: true,
      },
    );
  }

  private timeoutResult(idempotencyKey: string): WalletEffectResult {
    return {
      status: "timeout",
      idempotencyKey,
      reason: `wallet_result_timeout_${RESULT_TIMEOUT_MS}ms`,
    };
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

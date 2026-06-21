import * as amqp from "amqplib";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type {
  GameWalletGateway,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../application/ports/game-ports";
import { formatLogEvent } from "../system/log-event";

const REQUEST_EXCHANGE = "wallet.requests";
const RESULT_EXCHANGE = "wallet.results";
const RESULT_TIMEOUT_MS = Number(process.env.WALLET_RESULT_TIMEOUT_MS ?? 1500);

interface PendingWalletResult {
  result: Promise<WalletEffectResult>;
}

@Injectable()
export class RabbitMqGameWalletGateway implements GameWalletGateway, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqGameWalletGateway.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    const pendingResult = await this.createResultListener(request.idempotencyKey);
    await this.publish("wallet.bet_debit_requested", { ...request });
    return pendingResult.result;
  }

  async requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult> {
    const pendingResult = await this.createResultListener(request.idempotencyKey);
    await this.publish("wallet.payout_credit_requested", { ...request });
    return pendingResult.result;
  }

  async publish(eventName: string, payload: Record<string, unknown>): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertExchange(REQUEST_EXCHANGE, "topic", { durable: true });
    this.logger.log(formatLogEvent("rabbitmq.publish", {
      routingKey: eventName,
      direction: "publish",
      idempotencyKey: String(payload.idempotencyKey ?? ""),
      roundId: String(payload.roundId ?? ""),
      betId: String(payload.betId ?? ""),
      amountCents: Number(payload.amountCents ?? 0),
    }));
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
    this.logger.log(formatLogEvent("rabbitmq.publish", {
      routingKey: String(payload.eventName ?? "wallet.result_recorded"),
      direction: "publish",
      idempotencyKey: String(payload.idempotencyKey ?? ""),
      result: String(payload.status ?? ""),
    }));
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

  private async createResultListener(idempotencyKey: string): Promise<PendingWalletResult> {
    const channel = await this.getChannel();
    await channel.assertExchange(RESULT_EXCHANGE, "topic", { durable: true });
    const queue = await channel.assertQueue("", {
      exclusive: true,
      autoDelete: true,
      durable: false,
    });
    await channel.bindQueue(queue.queue, RESULT_EXCHANGE, "wallet.*");

    let resolveResult!: (result: WalletEffectResult) => void;
    const result = new Promise<WalletEffectResult>((resolve) => {
      resolveResult = resolve;
    });
    let consumerTag: string | undefined;
    let timeout: ReturnType<typeof setTimeout>;

    const consumer = await channel.consume(
      queue.queue,
      (message) => {
        if (!message) {
          return;
        }

        const result = JSON.parse(message.content.toString()) as WalletEffectResult;

        if (result.idempotencyKey !== idempotencyKey) {
          channel.ack(message);
          return;
        }

        clearTimeout(timeout);
        channel.ack(message);
        void channel.deleteQueue(queue.queue).catch(() => undefined);
        this.logger.log(formatLogEvent("rabbitmq.consume", {
          routingKey: message.fields.routingKey,
          direction: "consume",
          idempotencyKey: result.idempotencyKey,
          result: result.status,
          reason: result.reason,
        }));
        resolveResult({
          status: result.status,
          idempotencyKey: result.idempotencyKey,
          reason: result.reason,
        });
      },
      { noAck: false },
    );
    consumerTag = consumer.consumerTag;
    timeout = setTimeout(() => {
      if (consumerTag) {
        void channel.cancel(consumerTag).catch(() => undefined);
      }
      void channel.deleteQueue(queue.queue).catch(() => undefined);
      resolveResult(this.timeoutResult(idempotencyKey));
    }, RESULT_TIMEOUT_MS);

    return { result };
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

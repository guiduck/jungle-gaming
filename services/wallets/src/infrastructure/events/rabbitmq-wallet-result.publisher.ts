import * as amqp from "amqplib";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type {
  WalletOperationRecord,
  WalletResultPublisher,
} from "../../application/ports/wallet-ports";
import { formatLogEvent } from "../system/log-event";

const RESULT_EXCHANGE = "wallet.results";

@Injectable()
export class RabbitMqWalletResultPublisher implements WalletResultPublisher, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqWalletResultPublisher.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publish(operation: WalletOperationRecord): Promise<void> {
    if (process.env.RABBITMQ_PUBLISHERS_ENABLED !== "true") {
      return;
    }

    const eventName = this.eventName(operation);
    const channel = await this.getChannel();
    await channel.assertExchange(RESULT_EXCHANGE, "topic", { durable: true });
    this.logger.log(formatLogEvent("rabbitmq.publish", {
      routingKey: eventName,
      direction: "publish",
      idempotencyKey: operation.idempotencyKey,
      playerId: operation.playerId,
      amountCents: operation.amountCents,
      result: operation.status,
      reason: operation.reason,
    }));
    channel.publish(
      RESULT_EXCHANGE,
      eventName,
      Buffer.from(JSON.stringify({ eventName, ...operation })),
      {
        contentType: "application/json",
        persistent: true,
      },
    );
  }

  private eventName(operation: WalletOperationRecord): string {
    if (operation.type === "debit_bet") {
      return operation.status === "accepted"
        ? "wallet.bet_debit_accepted"
        : "wallet.bet_debit_rejected";
    }

    if (operation.type === "credit_payout") {
      return operation.status === "accepted"
        ? "wallet.payout_credit_accepted"
        : "wallet.payout_credit_rejected";
    }

    return "wallet.seed_credit_recorded";
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

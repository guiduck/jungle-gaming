import * as amqp from "amqplib";
import type { Logger } from "@nestjs/common";
import { formatLogEvent } from "../system/log-event";

const DEFAULT_RABBITMQ_URL = "amqp://admin:admin@rabbitmq:5672";
const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 1000;

type RabbitMqConnection = Awaited<ReturnType<typeof amqp.connect>>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function connectRabbitMq(logger: Logger, context: string): Promise<RabbitMqConnection> {
  const url = process.env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL;
  const attempts = positiveIntegerFromEnv("RABBITMQ_CONNECT_ATTEMPTS", DEFAULT_ATTEMPTS);
  const delayMs = positiveIntegerFromEnv("RABBITMQ_CONNECT_RETRY_MS", DEFAULT_DELAY_MS);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await amqp.connect(url);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      if (attempt === attempts) {
        logger.error(formatLogEvent("rabbitmq.connect.failed", {
          context,
          attempt,
          attempts,
          reason,
        }));
        throw error;
      }

      logger.warn(formatLogEvent("rabbitmq.connect.retry", {
        context,
        attempt,
        attempts,
        delayMs,
        reason,
      }));
      await sleep(delayMs);
    }
  }

  throw new Error("unreachable_rabbitmq_retry_state");
}

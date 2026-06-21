import { describe, expect, test } from "bun:test";
import { RabbitMqWalletResultConsumer } from "../../../src/infrastructure/events/rabbitmq-wallet-result.consumer";
import type {
  GameMessageReceiptRepository,
  WalletEffectResult,
} from "../../../src/application/ports/game-ports";

describe("RabbitMqWalletResultConsumer", () => {
  test("records wallet result receipts and ignores duplicate result messages", async () => {
    const handled: WalletEffectResult[] = [];
    const receipts = new FakeReceiptRepository();
    const consumer = new RabbitMqWalletResultConsumer(
      { handleWalletResult: (result: WalletEffectResult) => handled.push(result) },
      receipts,
    );
    const result: WalletEffectResult = {
      status: "accepted",
      idempotencyKey: "wallet-result-1",
    };

    await callHandleResult(consumer, result);
    await callHandleResult(consumer, result);

    expect(handled).toHaveLength(1);
    expect(receipts.records).toEqual([
      { idempotencyKey: "wallet-result-1", messageType: "wallet.result" },
    ]);
  });
});

async function callHandleResult(
  consumer: RabbitMqWalletResultConsumer,
  result: WalletEffectResult,
): Promise<void> {
  await (consumer as unknown as {
    handleResult(result: WalletEffectResult): Promise<void>;
  }).handleResult(result);
}

class FakeReceiptRepository implements GameMessageReceiptRepository {
  readonly records: Array<{ idempotencyKey: string; messageType: string }> = [];
  private readonly seen = new Set<string>();

  async has(idempotencyKey: string): Promise<boolean> {
    return this.seen.has(idempotencyKey);
  }

  async record(idempotencyKey: string, messageType: string): Promise<void> {
    this.seen.add(idempotencyKey);
    this.records.push({ idempotencyKey, messageType });
  }
}

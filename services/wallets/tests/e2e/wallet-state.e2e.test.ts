import { describe, expect, test } from "bun:test";
import { WalletStateService } from "../../src/application/wallet-state.service";
import type {
  Clock,
  IdGenerator,
  WalletOperationRecord,
  WalletResultPublisher,
} from "../../src/application/ports/wallet-ports";
import { InMemoryWalletOperationRepository } from "../../src/infrastructure/persistence/in-memory-wallet-operation.repository";
import { InMemoryWalletRepository } from "../../src/infrastructure/persistence/in-memory-wallet.repository";

describe("Wallet durable behavior contract", () => {
  test("seeds, debits, credits payouts, and returns duplicate idempotency outcomes once", async () => {
    const { service, publisher } = createService();

    expect((await service.getWallet("player-1")).balanceCents).toBe(100000);
    expect((await service.debitBet({
      idempotencyKey: "debit-1",
      playerId: "player-1",
      amountCents: 250,
    })).status).toBe("accepted");
    expect((await service.debitBet({
      idempotencyKey: "debit-1",
      playerId: "player-1",
      amountCents: 250,
    })).status).toBe("accepted");
    expect((await service.creditPayout({
      idempotencyKey: "payout-1",
      playerId: "player-1",
      amountCents: 300,
    })).status).toBe("accepted");
    await service.creditPayout({
      idempotencyKey: "payout-1",
      playerId: "player-1",
      amountCents: 300,
    });

    expect((await service.getWallet("player-1")).balanceCents).toBe(100050);
    expect(publisher.records.map((record) => record.idempotencyKey)).toEqual([
      "seed-credit:player-1",
      "debit-1",
      "payout-1",
    ]);
  });

  test("rejects insufficient balance without going negative and keeps rejection idempotent", async () => {
    const { service } = createService();

    const first = await service.debitBet({
      idempotencyKey: "too-large",
      playerId: "player-2",
      amountCents: 100001,
    });
    const duplicate = await service.debitBet({
      idempotencyKey: "too-large",
      playerId: "player-2",
      amountCents: 100001,
    });

    expect(first.status).toBe("rejected");
    expect(first.reason).toBe("insufficient_balance");
    expect(duplicate).toEqual(first);
    expect((await service.getWallet("player-2")).balanceCents).toBe(100000);
  });
});

class RecordingPublisher implements WalletResultPublisher {
  readonly records: WalletOperationRecord[] = [];

  publish(record: WalletOperationRecord): void {
    if (!this.records.some((candidate) => candidate.idempotencyKey === record.idempotencyKey)) {
      this.records.push(record);
    }
  }
}

function createService(): { service: WalletStateService; publisher: RecordingPublisher } {
  const wallets = new InMemoryWalletRepository();
  const operations = new InMemoryWalletOperationRepository(wallets);
  const publisher = new RecordingPublisher();
  const service = new WalletStateService(
    wallets,
    operations,
    publisher,
    { now: () => new Date("2026-06-20T00:00:00.000Z") } satisfies Clock,
    { next: (prefix: string) => `${prefix}-1` } satisfies IdGenerator,
  );

  return { service, publisher };
}

import { describe, expect, test } from "bun:test";
import { Money, PlayerId, Wallet } from "../../../src/domain";

describe("Wallet", () => {
  test("credits and debits integer cents", () => {
    const wallet = new Wallet("wallet-1", PlayerId.from("player"));

    wallet.credit("seed", Money.fromCents(1000), "seed_credit");
    wallet.debit("bet-1", Money.fromCents(250));

    expect(wallet.balanceCents).toBe(750);
  });

  test("rejects insufficient balance without going negative", () => {
    const wallet = new Wallet("wallet-1", PlayerId.from("player"));

    const result = wallet.debit("bet-1", Money.fromCents(250));

    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("insufficient_balance");
    expect(wallet.balanceCents).toBe(0);
  });

  test("is idempotent for repeated operations", () => {
    const wallet = new Wallet("wallet-1", PlayerId.from("player"));

    wallet.credit("seed", Money.fromCents(1000), "seed_credit");
    wallet.credit("seed", Money.fromCents(1000), "seed_credit");
    wallet.debit("bet-1", Money.fromCents(250));
    wallet.debit("bet-1", Money.fromCents(250));

    expect(wallet.balanceCents).toBe(750);
    expect(wallet.toSnapshot().operations).toHaveLength(2);
  });
});

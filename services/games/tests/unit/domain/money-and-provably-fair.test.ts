import { describe, expect, test } from "bun:test";
import { Money, PlayerId, ProvablyFair } from "../../../src/domain";

describe("Money", () => {
  test("uses integer cents and basis point multipliers", () => {
    expect(Money.fromCents(100).multiplyByMultiplierBps(15000).cents).toBe(150);
    expect(() => Money.fromCents(10.5)).toThrow("integer cents");
    expect(() => Money.fromCents(-1)).toThrow("negative");
  });
});

describe("PlayerId", () => {
  test("rejects empty values", () => {
    expect(PlayerId.from(" player ").value).toBe("player");
    expect(() => PlayerId.from(" ")).toThrow("required");
  });
});

describe("ProvablyFair", () => {
  test("calculates and verifies deterministic crash points", () => {
    const round = ProvablyFair.createRound("server-seed-1", "round-1", 100);

    expect(round.serverSeedHash).toHaveLength(64);
    expect(round.crashPoint.multiplierBps).toBeGreaterThanOrEqual(10000);
    expect(
      ProvablyFair.verify(
        round.serverSeed,
        round.serverSeedHash,
        round.nonce,
        round.crashPoint.multiplierBps,
        round.houseEdgeBps,
      ),
    ).toBe(true);
  });
});

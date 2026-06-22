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

  test("uses the full sampled HMAC range for multipliers above 2x", () => {
    const round = ProvablyFair.createRound("server-seed-fixed", "round-1", 100);

    expect(round.crashPoint.multiplierBps).toBe(96127);
    expect(round.crashPoint.multiplierBps).toBeGreaterThan(20000);
  });

  test("keeps overflow crash points below 14x without pinning them to the ceiling", () => {
    const round = ProvablyFair.createRound("seed-22", "round-22", 100);

    expect(round.crashPoint.multiplierBps).toBe(22138);
    expect(round.crashPoint.multiplierBps).toBeLessThan(140000);
    expect(
      ProvablyFair.verify(
        round.serverSeed,
        round.serverSeedHash,
        round.nonce,
        22138,
        round.houseEdgeBps,
      ),
    ).toBe(true);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { ProvablyFair } from "../../../src/domain";
import {
  isDemoDeterministicRoundsEnabled,
  nonceForRound,
  serverSeedForRound,
} from "../../../src/application/round-seed";

const ORIGINAL_ENV = { ...process.env };

describe("round seed selection", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("uses normal round-derived seeds unless demo determinism is enabled", () => {
    delete process.env.DEMO_DETERMINISTIC_ROUNDS;

    expect(isDemoDeterministicRoundsEnabled()).toBe(false);
    expect(serverSeedForRound("round-1")).toBe("server-seed-round-1");
    expect(nonceForRound("round-1")).toBe("round-1");
  });

  test("uses explicit demo seed and nonce while preserving provably fair verification", () => {
    process.env.DEMO_DETERMINISTIC_ROUNDS = "true";
    process.env.DEMO_ROUND_SERVER_SEED = "jungle-smoke-seed-2026";
    process.env.DEMO_ROUND_NONCE = "smoke-round";

    const round = ProvablyFair.createRound(
      serverSeedForRound("round-any"),
      nonceForRound("round-any"),
    );

    expect(isDemoDeterministicRoundsEnabled()).toBe(true);
    expect(round.crashPoint.multiplierBps).toBe(16332);
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

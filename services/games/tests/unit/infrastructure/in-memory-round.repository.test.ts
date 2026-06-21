import { describe, expect, test } from "bun:test";
import { Money, PlayerId } from "../../../src/domain";
import { InMemoryRoundRepository } from "../../../src/infrastructure/persistence/in-memory-round.repository";

describe("InMemoryRoundRepository", () => {
  test("supports current, active, completed, history, verification, and player snapshots", async () => {
    const repository = new InMemoryRoundRepository();
    const current = await repository.getCurrent();

    current.placeBet("bet-1", PlayerId.from("player-1"), Money.fromCents(100));
    await repository.saveCurrent(current);

    await repository.addCompleted({
      id: current.id,
      crashMultiplierBps: current.crashPoint.multiplierBps,
      serverSeedHash: current.serverSeedHash,
      serverSeed: `server-seed-${current.id}`,
      nonce: current.nonce,
      houseEdgeBps: 100,
      formula: {
        commitmentAlgorithm: "sha256",
        crashAlgorithm: "hmac-sha256",
        multiplierScale: "basis_points",
      },
      crashedAt: "2026-06-20T00:00:00.000Z",
    });

    expect(await repository.getActive()).toHaveLength(1);
    expect(await repository.getHistory(10)).toHaveLength(1);
    expect(await repository.getCompleted(current.id)).toBeDefined();
    expect(await repository.getPlayerRoundSnapshots("player-1", 10)).toHaveLength(1);

    const next = await repository.createNext();
    expect(next.id).not.toBe(current.id);
  });
});

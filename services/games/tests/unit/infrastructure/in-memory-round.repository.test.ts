import { describe, expect, test } from "bun:test";
import { CrashPoint, Money, PlayerId, Round } from "../../../src/domain";
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
      serverSeed: current.serverSeed || `test-server-seed-${current.id}`,
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

  test("builds richer completed-round history summaries", async () => {
    const repository = new InMemoryRoundRepository();

    expect(await repository.getRoundHistorySummaries(10)).toEqual([]);

    const lostRound = new Round(
      "round-lost",
      CrashPoint.fromBasisPoints(15000),
      "hash-lost",
      "nonce-lost",
    );
    lostRound.placeBet("bet-lost", PlayerId.from("player-lost"), Money.fromCents(200));
    lostRound.start();
    lostRound.crash();
    await completeRound(repository, lostRound, "2026-06-20T00:00:00.000Z");

    const autoRound = new Round(
      "round-auto",
      CrashPoint.fromBasisPoints(25000),
      "hash-auto",
      "nonce-auto",
    );
    autoRound.placeBet("bet-auto", PlayerId.from("player-auto"), Money.fromCents(300), 15000);
    autoRound.placeBet("bet-manual", PlayerId.from("player-manual"), Money.fromCents(400));
    autoRound.start();
    autoRound.autoCashOutEligibleBets(15000);
    autoRound.cashOut(PlayerId.from("player-manual"), 20000);
    autoRound.crash();
    await completeRound(repository, autoRound, "2026-06-20T00:01:00.000Z");

    const history = await repository.getRoundHistorySummaries(10);
    expect(history[0]?.id).toBe("round-auto");
    expect(history[0]?.acceptedBetCount).toBe(2);
    expect(history[0]?.cashedOutBetCount).toBe(2);
    expect(history[0]?.lostBetCount).toBe(0);
    expect(history[0]?.totalWageredCents).toBe(700);
    expect(history[0]?.totalPayoutCents).toBe(1250);
    expect(history[0]?.verificationAvailable).toBe(true);
    expect(history[0]?.notableBets.map((bet) => bet.cashoutTrigger)).toEqual(["manual", "auto"]);

    expect(history[1]?.id).toBe("round-lost");
    expect(history[1]?.acceptedBetCount).toBe(1);
    expect(history[1]?.lostBetCount).toBe(1);
    expect(history[1]?.totalWageredCents).toBe(200);
    expect(history[1]?.totalPayoutCents).toBe(0);
  });

  test("builds deterministic leaderboards from completed cashouts only", async () => {
    const repository = new InMemoryRoundRepository();

    const completed = new Round(
      "round-completed",
      CrashPoint.fromBasisPoints(30000),
      "hash-completed",
      "nonce-completed",
    );
    completed.placeBet("bet-a", PlayerId.from("player-a"), Money.fromCents(200));
    completed.placeBet("bet-b", PlayerId.from("player-b"), Money.fromCents(300));
    completed.placeBet("bet-lost", PlayerId.from("player-lost"), Money.fromCents(900));
    completed.start();
    completed.cashOut(PlayerId.from("player-a"), 15000);
    completed.cashOut(PlayerId.from("player-b"), 10000);
    completed.crash();
    await completeRound(repository, completed, "2026-06-20T00:00:00.000Z");

    const active = new Round(
      "round-active",
      CrashPoint.fromBasisPoints(30000),
      "hash-active",
      "nonce-active",
    );
    active.placeBet("bet-active", PlayerId.from("player-active"), Money.fromCents(1000));
    active.start();
    active.cashOut(PlayerId.from("player-active"), 25000);
    await repository.saveCurrent(active);

    const payout = await repository.getLeaderboard(10, "payout");
    expect(payout.map((entry) => entry.betId)).toEqual(["bet-a", "bet-b"]);
    expect(payout.map((entry) => entry.rank)).toEqual([1, 2]);

    const multiplier = await repository.getLeaderboard(10, "multiplier");
    expect(multiplier.map((entry) => entry.betId)).toEqual(["bet-a", "bet-b"]);
    expect(multiplier[0]?.cashoutMultiplierBps).toBe(15000);
  });

  test("builds player-scoped bet history with round context", async () => {
    const repository = new InMemoryRoundRepository();
    const round = new Round(
      "round-player",
      CrashPoint.fromBasisPoints(20000),
      "hash-player",
      "nonce-player",
    );
    round.placeBet("bet-player", PlayerId.from("player-1"), Money.fromCents(250), 15000);
    round.placeBet("bet-other", PlayerId.from("player-2"), Money.fromCents(250));
    round.start();
    round.autoCashOutEligibleBets(15000);
    round.crash();
    await completeRound(repository, round, "2026-06-20T00:00:00.000Z");

    const history = await repository.getPlayerBetHistory("player-1", 10);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      roundId: "round-player",
      betId: "bet-player",
      amountCents: 250,
      status: "cashed_out",
      crashMultiplierBps: 20000,
      autoCashoutMultiplierBps: 15000,
      cashoutMultiplierBps: 15000,
      payoutCents: 375,
      cashoutTrigger: "auto",
    });
  });
});

async function completeRound(
  repository: InMemoryRoundRepository,
  round: Round,
  crashedAt: string,
): Promise<void> {
  await repository.saveCurrent(round);
  await repository.addCompleted({
    id: round.id,
    crashMultiplierBps: round.crashPoint.multiplierBps,
    serverSeedHash: round.serverSeedHash,
    serverSeed: round.serverSeed || `test-server-seed-${round.id}`,
    nonce: round.nonce,
    houseEdgeBps: 100,
    formula: {
      commitmentAlgorithm: "sha256",
      crashAlgorithm: "hmac-sha256",
      multiplierScale: "basis_points",
    },
    crashedAt,
  });
  await repository.createNext();
}

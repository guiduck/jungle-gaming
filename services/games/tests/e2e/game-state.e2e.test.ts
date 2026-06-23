import { describe, expect, test } from "bun:test";
import { GameStateService } from "../../src/application/game-state.service";
import type {
  Clock,
  CompletedRoundRecord,
  GameEventPublisher,
  GameWalletGateway,
  IdGenerator,
  LeaderboardEntry,
  LeaderboardMetric,
  PlayerBetHistoryEntry,
  RoundRepository,
  RoundHistorySummary,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../src/application/ports/game-ports";
import {
  toLeaderboard,
  toPlayerBetHistory,
  toRoundHistorySummary,
} from "../../src/application/round-read-models";
import { CrashPoint, ProvablyFair, Round } from "../../src/domain";
import type { RoundSnapshot } from "../../src/domain";

describe("Game money and persistence flows", () => {
  test("accepts a bet only after wallet debit confirmation", async () => {
    const gateway = new FakeWalletGateway({ status: "accepted", idempotencyKey: "" });
    const service = createService({ gateway });

    const round = await service.placeBet("player-1", 250);

    expect(round.bets).toHaveLength(1);
    expect(round.bets[0]?.amountCents).toBe(250);
    expect(gateway.debits).toHaveLength(1);
  });

  test("marks the accepted player bet ready before automatic start", async () => {
    const events = new RecordingEvents();
    const service = createService({ events });

    const placed = await service.placeBet("player-1", 250);
    expect(placed.bets[0]?.ready).toBe(false);

    const ready = await service.markBetReady("player-1");

    expect(ready.bets[0]?.ready).toBe(true);
    expect(events.events).toContainEqual({
      eventName: "bet.ready",
      payload: {
        roundId: "round-1",
        playerId: "player-1",
        round: expect.objectContaining({ id: "round-1", status: "betting" }),
      },
    });
  });

  test("does not accept a bet when wallet confirmation times out", async () => {
    const service = createService({
      gateway: new FakeWalletGateway({ status: "timeout", idempotencyKey: "" }),
    });

    await expect(service.placeBet("player-1", 250)).rejects.toThrow("timed out");
    expect((await service.getCurrentRound()).bets).toHaveLength(0);
  });

  test("refunds debit confirmation when betting window closes before bet persistence", async () => {
    const repository = new FakeRoundRepository([createRound("round-late", "betting")]);
    const gateway = new FakeWalletGateway({ status: "accepted", idempotencyKey: "" });
    gateway.afterDebitRequest = async () => {
      const round = await repository.getCurrent();
      round.start();
      await repository.saveCurrent(round);
    };
    const service = createService({ repository, gateway });

    await expect(service.placeBet("player-1", 250)).rejects.toThrow("debit refunded");
    expect((await service.getCurrentRound()).bets).toHaveLength(0);
    expect(gateway.payouts).toHaveLength(1);
    expect(gateway.payouts[0]?.idempotencyKey).toBe("bet-refund:round-late:player-1");
    expect(gateway.payouts[0]?.amountCents).toBe(250);
  });

  test("rejects insufficient balance, duplicate bet, invalid phase, and invalid amount", async () => {
    const rejected = createService({
      gateway: new FakeWalletGateway({
        status: "rejected",
        idempotencyKey: "",
        reason: "insufficient_balance",
      }),
    });
    await expect(rejected.placeBet("player-1", 250)).rejects.toThrow("insufficient_balance");

    const duplicate = createService();
    await duplicate.placeBet("player-1", 250);
    await expect(duplicate.placeBet("player-1", 250)).rejects.toThrow("already has a bet");

    const invalidPhase = createService();
    await invalidPhase.startRound();
    await expect(invalidPhase.placeBet("player-1", 250)).rejects.toThrow("not accepting bets");

    const invalidAmount = createService();
    await expect(invalidAmount.placeBet("player-1", 99)).rejects.toThrow("between 1.00 and 1000.00");

    const invalidAutoGateway = new FakeWalletGateway();
    const invalidAuto = createService({ gateway: invalidAutoGateway });
    await expect(invalidAuto.placeBet("player-1", 250, 10999)).rejects.toThrow("Auto cashout");
    expect(invalidAutoGateway.debits).toHaveLength(0);
  });

  test("accepts cashout before crash, rejects after crash, and preserves verification metadata", async () => {
    const gateway = new FakeWalletGateway({ status: "accepted", idempotencyKey: "" });
    const service = createService({ gateway });

    await service.placeBet("player-1", 250);
    await service.startRound();
    const cashedOut = await service.cashOut("player-1", 11000);

    expect(cashedOut.bets[0]?.status).toBe("cashed_out");
    expect(cashedOut.bets[0]?.payoutCents).toBe(275);
    expect(cashedOut.bets[0]?.cashoutTrigger).toBe("manual");

    const crashed = await service.crashRound();
    await expect(service.cashOut("player-1", 10500)).rejects.toThrow("not running");
    expect(gateway.payouts).toHaveLength(1);

    const verification = await service.getVerification(crashed.id);
    expect(
      ProvablyFair.verify(
        verification.serverSeed,
        verification.serverSeedHash,
        verification.nonce,
        verification.crashMultiplierBps,
        verification.houseEdgeBps,
      ),
    ).toBe(true);
  });

  test("reconciles interrupted active rounds without leaving multiple playable rounds", async () => {
    const repository = new FakeRoundRepository([
      createRound("old-betting", "betting"),
      createRound("old-running", "running"),
    ]);
    const service = createService({ repository });

    await service.reconcileCurrentRoundAfterRestart();

    const active = await repository.getActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.status).toBe("betting");
    expect(repository.completed.map((round) => round.id)).toContain("old-betting");
    expect(repository.completed.map((round) => round.id)).toContain("old-running");
  });

  test("persists auto-cashout data, publishes events, and replays payout idempotently", async () => {
    const repository = new FakeRoundRepository([createRoundWithCrashPoint("round-auto", "betting", 20000)]);
    const gateway = new FakeWalletGateway({ status: "accepted", idempotencyKey: "" });
    const events = new RecordingEvents();
    const service = createService({ repository, gateway, events });

    const placed = await service.placeBet("player-1", 250, 15000);
    expect(placed.bets[0]?.autoCashoutMultiplierBps).toBe(15000);

    await service.startRound();
    const evaluated = await service.evaluateAutoCashouts(15500);
    expect(evaluated.bets[0]?.cashoutTrigger).toBe("auto");
    expect(evaluated.bets[0]?.payoutCents).toBe(375);
    expect(events.events.some((event) =>
      event.eventName === "cashout.accepted" &&
      event.payload.cashoutTrigger === "auto" &&
      event.payload.autoCashoutMultiplierBps === 15000
    )).toBe(true);

    const snapshot = (await repository.getCurrent()).toSnapshot();
    expect(snapshot.bets[0]?.autoCashoutMultiplierBps).toBe(15000);
    expect(snapshot.bets[0]?.cashoutTrigger).toBe("auto");

    await service.crashRound();
    expect(gateway.payouts).toHaveLength(1);
    expect(gateway.payouts[0]?.idempotencyKey).toBe("payout-credit:round-auto:bet-player-1-1");
  });

  test("publishes round snapshots for realtime phase transitions", async () => {
    const events = new RecordingEvents();
    const service = createService({ events });

    const started = await service.startRound();
    expect(started.status).toBe("running");
    expect(events.events).toContainEqual({
      eventName: "round.started",
      payload: {
        roundId: "round-1",
        round: expect.objectContaining({ id: "round-1", status: "running" }),
      },
    });

    await service.crashRound();
    const next = await service.settleAndCreateNextRound();

    expect(next.status).toBe("betting");
    expect(events.events).toContainEqual({
      eventName: "round.betting.opened",
      payload: {
        roundId: "round-2",
        round: expect.objectContaining({ id: "round-2", status: "betting" }),
      },
    });
  });
});

class FakeRoundRepository implements RoundRepository {
  readonly completed: CompletedRoundRecord[] = [];

  constructor(private activeRounds = [createRound("round-1", "betting")]) {}

  async getCurrent(): Promise<Round> {
    return this.activeRounds.at(-1) ?? this.createNext();
  }

  async getActive(): Promise<Round[]> {
    return this.activeRounds.filter((round) => round.status !== "settled");
  }

  async saveCurrent(round: Round): Promise<void> {
    const index = this.activeRounds.findIndex((candidate) => candidate.id === round.id);
    if (index >= 0) {
      this.activeRounds[index] = round;
      return;
    }
    this.activeRounds.push(round);
  }

  async createNext(): Promise<Round> {
    const round = createRound(`round-${this.activeRounds.length + 1}`, "betting");
    this.activeRounds.push(round);
    return round;
  }

  async addCompleted(round: CompletedRoundRecord): Promise<void> {
    if (!this.completed.some((candidate) => candidate.id === round.id)) {
      this.completed.push(round);
    }
  }

  async getHistory(limit: number): Promise<CompletedRoundRecord[]> {
    return this.completed.slice(-limit).reverse();
  }

  async getCompleted(roundId: string): Promise<CompletedRoundRecord | undefined> {
    return this.completed.find((round) => round.id === roundId);
  }

  async getPlayerRoundSnapshots(playerId: string, limit: number): Promise<RoundSnapshot[]> {
    return this.activeRounds
      .map((round) => round.toSnapshot())
      .filter((round) => round.bets.some((bet) => bet.playerId === playerId))
      .slice(-limit)
      .reverse();
  }

  async getRoundHistorySummaries(limit: number): Promise<RoundHistorySummary[]> {
    return this.completed
      .map((completed) => ({
        round: this.activeRounds.find((round) => round.id === completed.id)?.toSnapshot(),
        completed,
      }))
      .filter((input): input is { round: RoundSnapshot; completed: CompletedRoundRecord } =>
        input.round !== undefined
      )
      .slice(-limit)
      .reverse()
      .map((input) => toRoundHistorySummary(input));
  }

  async getLeaderboard(limit: number, metric: LeaderboardMetric): Promise<LeaderboardEntry[]> {
    return toLeaderboard(
      this.completed
        .map((completed) => ({
          round: this.activeRounds.find((round) => round.id === completed.id)?.toSnapshot(),
          completed,
        }))
        .filter((input): input is { round: RoundSnapshot; completed: CompletedRoundRecord } =>
          input.round !== undefined
        ),
      limit,
      metric,
    );
  }

  async getPlayerBetHistory(
    playerId: string,
    limit: number,
  ): Promise<PlayerBetHistoryEntry[]> {
    const completedByRoundId = new Map(this.completed.map((round) => [round.id, round]));
    return toPlayerBetHistory(
      this.activeRounds
        .map((round) => round.toSnapshot())
        .reverse()
        .map((round) => ({ round, completed: completedByRoundId.get(round.id) })),
      playerId,
      limit,
    );
  }
}

class RecordingEvents implements GameEventPublisher {
  readonly events: Array<{ eventName: string; payload: Record<string, unknown> }> = [];

  publish(eventName: string, payload: Record<string, unknown>): void {
    this.events.push({ eventName, payload });
  }
}

class FakeWalletGateway implements GameWalletGateway {
  readonly debits: WalletEffectRequest[] = [];
  readonly payouts: WalletPayoutRequest[] = [];
  afterDebitRequest?: () => void | Promise<void>;

  constructor(private readonly result: WalletEffectResult = { status: "accepted", idempotencyKey: "" }) {}

  async requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    this.debits.push(request);
    await this.afterDebitRequest?.();
    return { ...this.result, idempotencyKey: request.idempotencyKey };
  }

  async requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult> {
    this.payouts.push(request);
    return { status: "accepted", idempotencyKey: request.idempotencyKey };
  }
}

function createService(options: {
  repository?: FakeRoundRepository;
  gateway?: FakeWalletGateway;
  events?: GameEventPublisher;
} = {}): GameStateService {
  return new GameStateService(
    options.repository ?? new FakeRoundRepository(),
    options.events ?? ({ publish: () => undefined } satisfies GameEventPublisher),
    options.gateway ?? new FakeWalletGateway(),
    { now: () => new Date("2026-06-20T00:00:00.000Z") } satisfies Clock,
    { next: (prefix: string) => `${prefix}-1` } satisfies IdGenerator,
  );
}

function createRound(id: string, status: "betting" | "running"): Round {
  const fairness = ProvablyFair.createRound(`server-seed-${id}`, id);
  const round = new Round(
    id,
    CrashPoint.fromBasisPoints(fairness.crashPoint.multiplierBps),
    fairness.serverSeedHash,
    fairness.nonce,
    fairness.serverSeed,
  );

  if (status === "running") {
    round.start();
  }

  return round;
}

function createRoundWithCrashPoint(
  id: string,
  status: "betting" | "running",
  crashMultiplierBps: number,
): Round {
  const round = new Round(
    id,
    CrashPoint.fromBasisPoints(crashMultiplierBps),
    "controlled-hash",
    id,
  );

  if (status === "running") {
    round.start();
  }

  return round;
}

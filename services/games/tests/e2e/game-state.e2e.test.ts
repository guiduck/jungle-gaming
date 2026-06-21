import { describe, expect, test } from "bun:test";
import { GameStateService } from "../../src/application/game-state.service";
import type {
  Clock,
  CompletedRoundRecord,
  GameEventPublisher,
  GameWalletGateway,
  IdGenerator,
  RoundRepository,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../src/application/ports/game-ports";
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

  test("does not accept a bet when wallet confirmation times out", async () => {
    const service = createService({
      gateway: new FakeWalletGateway({ status: "timeout", idempotencyKey: "" }),
    });

    await expect(service.placeBet("player-1", 250)).rejects.toThrow("timed out");
    expect((await service.getCurrentRound()).bets).toHaveLength(0);
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
  });

  test("accepts cashout before crash, rejects after crash, and preserves verification metadata", async () => {
    const gateway = new FakeWalletGateway({ status: "accepted", idempotencyKey: "" });
    const service = createService({ gateway });

    await service.placeBet("player-1", 250);
    await service.startRound();
    const cashedOut = await service.cashOut("player-1", 11000);

    expect(cashedOut.bets[0]?.status).toBe("cashed_out");
    expect(cashedOut.bets[0]?.payoutCents).toBe(275);

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
}

class FakeWalletGateway implements GameWalletGateway {
  readonly debits: WalletEffectRequest[] = [];
  readonly payouts: WalletPayoutRequest[] = [];

  constructor(private readonly result: WalletEffectResult = { status: "accepted", idempotencyKey: "" }) {}

  async requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    this.debits.push(request);
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
} = {}): GameStateService {
  return new GameStateService(
    options.repository ?? new FakeRoundRepository(),
    { publish: () => undefined } satisfies GameEventPublisher,
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
  );

  if (status === "running") {
    round.start();
  }

  return round;
}

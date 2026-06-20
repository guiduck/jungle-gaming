import { Inject, Injectable } from "@nestjs/common";
import {
  DomainError,
  Money,
  PlayerId,
} from "../domain";
import type { RoundSnapshot } from "../domain";
import {
  GAME_CLOCK,
  GAME_EVENT_PUBLISHER,
  GAME_ID_GENERATOR,
  GAME_WALLET_GATEWAY,
  ROUND_REPOSITORY,
} from "./ports/game-ports";
import type {
  Clock,
  CompletedRoundRecord,
  GameEventPublisher,
  GameWalletGateway,
  IdGenerator,
  RoundRepository,
  WalletEffectResult,
} from "./ports/game-ports";

const HOUSE_EDGE_BPS = 100;
const VERIFICATION_FORMULA = {
  commitmentAlgorithm: "sha256" as const,
  crashAlgorithm: "hmac-sha256" as const,
  multiplierScale: "basis_points" as const,
};

@Injectable()
export class GameStateService {
  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly rounds: RoundRepository,
    @Inject(GAME_EVENT_PUBLISHER)
    private readonly events: GameEventPublisher,
    @Inject(GAME_WALLET_GATEWAY)
    private readonly walletGateway: GameWalletGateway,
    @Inject(GAME_CLOCK)
    private readonly clock: Clock,
    @Inject(GAME_ID_GENERATOR)
    private readonly ids: IdGenerator,
  ) {}

  getCurrentRound(): RoundSnapshot {
    return this.rounds.getCurrent().toSnapshot();
  }

  getRoundHistory(): CompletedRoundRecord[] {
    return this.rounds.getHistory(20);
  }

  getVerification(roundId: string): CompletedRoundRecord {
    const round = this.rounds.getCompleted(roundId);

    if (!round) {
      throw new DomainError("Round is not completed or does not exist");
    }

    return round;
  }

  getPlayerBets(playerIdValue: string): RoundSnapshot[] {
    const playerId = PlayerId.from(playerIdValue);
    return this.rounds.getPlayerRoundSnapshots(playerId.value, 20);
  }

  async placeBet(playerIdValue: string, amountCents: number): Promise<RoundSnapshot> {
    const playerId = PlayerId.from(playerIdValue);
    const round = this.rounds.getCurrent();
    const betId = this.ids.next(`bet-${playerId.value}`);
    const amount = Money.fromCents(amountCents);
    round.assertCanPlaceBet(playerId, amount);
    const now = this.clock.now().toISOString();
    const debitResult = await this.walletGateway.requestBetDebit({
      idempotencyKey: `bet-debit:${round.id}:${playerId.value}`,
      playerId: playerId.value,
      roundId: round.id,
      betId,
      amountCents: amount.cents,
      occurredAt: now,
    });

    this.assertWalletAccepted(debitResult, "Bet wallet confirmation timed out");

    const bet = round.placeBet(
      betId,
      playerId,
      amount,
    );
    this.rounds.saveCurrent(round);
    this.events.publish("bet.accepted", {
      roundId: round.id,
      betId: bet.id,
      playerId: playerId.value,
      amountCents,
      walletOperationKey: debitResult.idempotencyKey,
    });
    return round.toSnapshot();
  }

  cashOut(playerIdValue: string, multiplierBps: number): RoundSnapshot {
    const round = this.rounds.getCurrent();
    const playerId = PlayerId.from(playerIdValue);
    const payout = round.cashOut(playerId, multiplierBps);
    this.rounds.saveCurrent(round);
    this.events.publish("cashout.accepted", {
      roundId: round.id,
      playerId: playerId.value,
      multiplierBps,
      payoutCents: payout.cents,
    });
    return round.toSnapshot();
  }

  startRound(): RoundSnapshot {
    const round = this.rounds.getCurrent();
    round.start();
    this.rounds.saveCurrent(round);
    this.events.publish("round.started", { roundId: round.id });
    return round.toSnapshot();
  }

  publishMultiplierTick(multiplierBps: number): void {
    const round = this.rounds.getCurrent();
    if (round.status !== "running") {
      return;
    }

    this.events.publish("round.multiplier", {
      roundId: round.id,
      multiplierBps,
    });
  }

  async crashRound(): Promise<RoundSnapshot> {
    const round = this.rounds.getCurrent();
    round.crash();

    this.rounds.addCompleted({
      id: round.id,
      crashMultiplierBps: round.crashPoint.multiplierBps,
      serverSeedHash: round.serverSeedHash,
      serverSeed: `server-seed-${round.id}`,
      nonce: round.nonce,
      houseEdgeBps: HOUSE_EDGE_BPS,
      formula: VERIFICATION_FORMULA,
      crashedAt: this.clock.now().toISOString(),
    });
    this.rounds.saveCurrent(round);
    await Promise.all(round.toSnapshot().bets
      .filter((bet) => bet.status === "cashed_out" && bet.payoutCents && bet.cashoutMultiplierBps)
      .map((bet) =>
        this.walletGateway.requestPayoutCredit({
          idempotencyKey: `payout-credit:${round.id}:${bet.id}`,
          playerId: bet.playerId,
          roundId: round.id,
          betId: bet.id,
          amountCents: bet.payoutCents ?? 0,
          cashoutMultiplierBps: bet.cashoutMultiplierBps ?? 0,
          occurredAt: this.clock.now().toISOString(),
        }),
      ));
    this.events.publish("round.crashed", {
      roundId: round.id,
      crashMultiplierBps: round.crashPoint.multiplierBps,
    });

    return round.toSnapshot();
  }

  settleAndCreateNextRound(): RoundSnapshot {
    const round = this.rounds.getCurrent();
    round.settle();
    this.rounds.saveCurrent(round);
    this.events.publish("round.settled", { roundId: round.id });
    return this.rounds.createNext().toSnapshot();
  }

  handleWalletResult(result: WalletEffectResult): void {
    this.events.publish("wallet.result_recorded", {
      idempotencyKey: result.idempotencyKey,
      status: result.status,
      reason: result.reason,
    });
  }

  private assertWalletAccepted(result: WalletEffectResult, timeoutMessage: string): void {
    if (result.status === "accepted") {
      return;
    }

    if (result.status === "timeout") {
      throw new DomainError(timeoutMessage);
    }

    throw new DomainError(result.reason ?? "Wallet rejected the operation");
  }
}

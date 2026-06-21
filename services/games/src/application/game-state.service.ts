import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  DomainError,
  Money,
  PlayerId,
} from "../domain";
import type { Round, RoundSnapshot } from "../domain";
import {
  GAME_CLOCK,
  GAME_EVENT_PUBLISHER,
  GAME_ID_GENERATOR,
  GAME_WALLET_GATEWAY,
  ROUND_REPOSITORY,
} from "./ports/game-ports";
import { serverSeedForRound } from "./round-seed";
import { formatLogEvent } from "../infrastructure/system/log-event";
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
  private readonly logger = new Logger(GameStateService.name);

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

  async getCurrentRound(): Promise<RoundSnapshot> {
    return (await this.rounds.getCurrent()).toSnapshot();
  }

  getRoundHistory(): Promise<CompletedRoundRecord[]> {
    return this.rounds.getHistory(20);
  }

  async getVerification(roundId: string): Promise<CompletedRoundRecord> {
    const round = await this.rounds.getCompleted(roundId);

    if (!round) {
      throw new DomainError("Round is not completed or does not exist");
    }

    return round;
  }

  getPlayerBets(playerIdValue: string): Promise<RoundSnapshot[]> {
    const playerId = PlayerId.from(playerIdValue);
    return this.rounds.getPlayerRoundSnapshots(playerId.value, 20);
  }

  async placeBet(playerIdValue: string, amountCents: number): Promise<RoundSnapshot> {
    const playerId = PlayerId.from(playerIdValue);
    const round = await this.rounds.getCurrent();
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
    this.logger.log(formatLogEvent("wallet.debit.accepted", {
      roundId: round.id,
      betId,
      playerId: playerId.value,
      amountCents: amount.cents,
      idempotencyKey: debitResult.idempotencyKey,
      result: debitResult.status,
    }));

    const bet = round.placeBet(
      betId,
      playerId,
      amount,
    );
    await this.rounds.saveCurrent(round);
    this.events.publish("bet.accepted", {
      roundId: round.id,
      betId: bet.id,
      playerId: playerId.value,
      amountCents,
      walletOperationKey: debitResult.idempotencyKey,
    });
    return round.toSnapshot();
  }

  async cashOut(playerIdValue: string, multiplierBps: number): Promise<RoundSnapshot> {
    const round = await this.rounds.getCurrent();
    const playerId = PlayerId.from(playerIdValue);
    const payout = round.cashOut(playerId, multiplierBps);
    await this.rounds.saveCurrent(round);
    this.logger.log(formatLogEvent("cashout.accepted", {
      roundId: round.id,
      playerId: playerId.value,
      multiplierBps,
      amountCents: payout.cents,
    }));
    this.events.publish("cashout.accepted", {
      roundId: round.id,
      playerId: playerId.value,
      multiplierBps,
      payoutCents: payout.cents,
    });
    return round.toSnapshot();
  }

  async startRound(): Promise<RoundSnapshot> {
    const round = await this.rounds.getCurrent();
    round.start();
    await this.rounds.saveCurrent(round);
    this.logger.log(formatLogEvent("round.started", {
      roundId: round.id,
      multiplierBps: round.crashPoint.multiplierBps,
    }));
    this.events.publish("round.started", { roundId: round.id });
    return round.toSnapshot();
  }

  async publishMultiplierTick(multiplierBps: number): Promise<void> {
    const round = await this.rounds.getCurrent();
    if (round.status !== "running") {
      return;
    }

    this.events.publish("round.multiplier", {
      roundId: round.id,
      multiplierBps,
    });
  }

  async crashRound(): Promise<RoundSnapshot> {
    const round = await this.rounds.getCurrent();
    round.crash();

    await this.recordCompletedRound(round);
    await this.rounds.saveCurrent(round);
    await this.requestCashedOutPayouts(round);
    this.logger.log(formatLogEvent("round.crashed", {
      roundId: round.id,
      multiplierBps: round.crashPoint.multiplierBps,
      result: "completed_recorded",
    }));
    this.events.publish("round.crashed", {
      roundId: round.id,
      crashMultiplierBps: round.crashPoint.multiplierBps,
    });

    return round.toSnapshot();
  }

  async reconcileCurrentRoundAfterRestart(): Promise<void> {
    const activeRounds = await this.rounds.getActive();
    this.logger.log(formatLogEvent("round.reconciliation.started", {
      result: "startup",
      count: activeRounds.length,
    }));
    const latestActiveRound = activeRounds[activeRounds.length - 1];
    let hasPlayableRound = latestActiveRound?.status === "betting";

    for (const round of activeRounds) {
      const shouldPreserveBettingRound = round === latestActiveRound && round.status === "betting";
      const settled = await this.reconcileActiveRound(round, !shouldPreserveBettingRound);
      if (settled && !hasPlayableRound) {
        await this.rounds.createNext();
        hasPlayableRound = true;
      }
    }
    this.logger.log(formatLogEvent("round.reconciliation.completed", {
      result: "ok",
    }));
  }

  private async reconcileActiveRound(round: Round, forceTerminal: boolean): Promise<boolean> {
    if (round.status === "betting") {
      if (!forceTerminal) {
        return false;
      }

      round.start();
      round.crash();
      await this.recordCompletedRound(round);
      await this.rounds.saveCurrent(round);
      this.events.publish("round.reconciled", {
        roundId: round.id,
        fromStatus: "betting",
        toStatus: "crashed",
        reason: "service_restart_multiple_active_rounds",
      });
      await this.settleRound(round);
      return true;
    }

    if (round.status === "running") {
      round.crash();
      await this.recordCompletedRound(round);
      await this.rounds.saveCurrent(round);
      await this.requestCashedOutPayouts(round);
      this.events.publish("round.reconciled", {
        roundId: round.id,
        fromStatus: "running",
        toStatus: "crashed",
        reason: "service_restart",
      });
      await this.settleRound(round);
      return true;
    }

    if (round.status === "crashed") {
      await this.recordCompletedRound(round);
      await this.requestCashedOutPayouts(round);
      this.events.publish("round.reconciled", {
        roundId: round.id,
        fromStatus: "crashed",
        toStatus: "settled",
        reason: "service_restart",
      });
      await this.settleRound(round);
      return true;
    }

    return false;
  }

  async settleAndCreateNextRound(): Promise<RoundSnapshot> {
    const round = await this.rounds.getCurrent();
    return this.settleRoundAndCreateNext(round);
  }

  private async settleRoundAndCreateNext(round: Round): Promise<RoundSnapshot> {
    await this.settleRound(round);
    const nextRound = await this.rounds.createNext();
    this.logger.log(formatLogEvent("round.betting.opened", {
      roundId: nextRound.id,
      result: "created",
    }));
    return nextRound.toSnapshot();
  }

  private async settleRound(round: Round): Promise<void> {
    round.settle();
    await this.rounds.saveCurrent(round);
    this.logger.log(formatLogEvent("round.settled", { roundId: round.id }));
    this.events.publish("round.settled", { roundId: round.id });
  }

  handleWalletResult(result: WalletEffectResult): void {
    this.logger.log(formatLogEvent("wallet.result.recorded", {
      idempotencyKey: result.idempotencyKey,
      result: result.status,
      reason: result.reason,
    }));
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
      this.logger.warn(formatLogEvent("wallet.result.timeout", {
        idempotencyKey: result.idempotencyKey,
        reason: result.reason,
      }));
      throw new DomainError(timeoutMessage);
    }

    this.logger.warn(formatLogEvent("wallet.result.rejected", {
      idempotencyKey: result.idempotencyKey,
      reason: result.reason,
    }));
    throw new DomainError(result.reason ?? "Wallet rejected the operation");
  }

  private recordCompletedRound(round: Round): Promise<void> {
    return this.rounds.addCompleted({
      id: round.id,
      crashMultiplierBps: round.crashPoint.multiplierBps,
      serverSeedHash: round.serverSeedHash,
      serverSeed: serverSeedForRound(round.id),
      nonce: round.nonce,
      houseEdgeBps: HOUSE_EDGE_BPS,
      formula: VERIFICATION_FORMULA,
      crashedAt: this.clock.now().toISOString(),
    });
  }

  private async requestCashedOutPayouts(round: Round): Promise<void> {
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
        }).then((result) => {
          this.logger.log(formatLogEvent("wallet.payout.result", {
            roundId: round.id,
            betId: bet.id,
            playerId: bet.playerId,
            amountCents: bet.payoutCents ?? 0,
            idempotencyKey: result.idempotencyKey,
            result: result.status,
            reason: result.reason,
          }));
        }),
      ));
  }
}

import { Bet } from "./bet";
import type { BetSnapshot, CashoutTrigger } from "./bet";
import { DomainError } from "../errors/domain-error";
import { CrashPoint } from "../value-objects/crash-point";
import { Money } from "../value-objects/money";
import { PlayerId } from "../value-objects/player-id";

export type RoundStatus = "betting" | "running" | "crashed" | "settled";

export interface RoundSnapshot {
  id: string;
  status: RoundStatus;
  crashMultiplierBps: number;
  serverSeedHash?: string;
  nonce?: string;
  bets: BetSnapshot[];
}

export interface CashoutResult {
  betId: string;
  playerId: string;
  multiplierBps: number;
  payoutCents: number;
  cashoutTrigger: CashoutTrigger;
  autoCashoutMultiplierBps?: number;
}

export class Round {
  private readonly bets: Bet[] = [];
  private statusValue: RoundStatus = "betting";

  constructor(
    public readonly id: string,
    public readonly crashPoint: CrashPoint,
    public readonly serverSeedHash: string,
    public readonly nonce: string,
    public readonly serverSeed = "",
  ) {}

  static rehydrate(snapshot: RoundSnapshot, serverSeed = ""): Round {
    if (!snapshot.serverSeedHash || !snapshot.nonce) {
      throw new DomainError("Round persistence snapshot is missing verification metadata");
    }

    const round = new Round(
      snapshot.id,
      CrashPoint.fromBasisPoints(snapshot.crashMultiplierBps),
      snapshot.serverSeedHash,
      snapshot.nonce,
      serverSeed,
    );
    round.statusValue = snapshot.status;
    snapshot.bets.forEach((bet) => round.bets.push(Bet.rehydrate(bet)));
    return round;
  }

  get status(): RoundStatus {
    return this.statusValue;
  }

  assertCanPlaceBet(
    playerId: PlayerId,
    amount: Money,
    autoCashoutMultiplierBps?: number | null,
  ): void {
    if (this.statusValue !== "betting") {
      throw new DomainError("Round is not accepting bets");
    }

    if (this.bets.some((bet) => bet.belongsTo(playerId))) {
      throw new DomainError("Player already has a bet in this round");
    }

    Bet.create("__validation__", playerId, amount, autoCashoutMultiplierBps);
  }

  placeBet(
    betId: string,
    playerId: PlayerId,
    amount: Money,
    autoCashoutMultiplierBps?: number | null,
  ): Bet {
    this.assertCanPlaceBet(playerId, amount, autoCashoutMultiplierBps);

    const bet = Bet.create(betId, playerId, amount, autoCashoutMultiplierBps);
    this.bets.push(bet);
    return bet;
  }

  start(): void {
    if (this.statusValue !== "betting") {
      throw new DomainError("Round can only start from betting");
    }

    this.statusValue = "running";
  }

  markPlayerReady(playerId: PlayerId): void {
    if (this.statusValue !== "betting") {
      throw new DomainError("Round is not accepting ready confirmations");
    }

    const bet = this.bets.find((candidate) => candidate.belongsTo(playerId));

    if (!bet) {
      throw new DomainError("Player has no bet in this round");
    }

    bet.markReady();
  }

  canStartAfterBettingWindow(): boolean {
    const pendingBets = this.bets.filter((bet) => bet.status === "pending");
    return pendingBets.length === 0 || pendingBets.every((bet) => bet.ready);
  }

  cashOut(playerId: PlayerId, multiplierBps: number, trigger: CashoutTrigger = "manual"): Money {
    if (this.statusValue !== "running") {
      throw new DomainError("Round is not running");
    }

    if (multiplierBps >= this.crashPoint.multiplierBps) {
      throw new DomainError("Cashout arrived after crash");
    }

    const bet = this.bets.find((candidate) => candidate.belongsTo(playerId));

    if (!bet) {
      throw new DomainError("Player has no bet in this round");
    }

    return bet.cashOut(multiplierBps, trigger);
  }

  autoCashOutEligibleBets(currentMultiplierBps: number): CashoutResult[] {
    if (this.statusValue !== "running") {
      return [];
    }

    return this.bets
      .filter((bet) => bet.canAutoCashOut(currentMultiplierBps, this.crashPoint.multiplierBps))
      .map((bet) => {
        const multiplierBps = bet.autoCashoutMultiplierBps ?? currentMultiplierBps;
        const payout = bet.cashOut(multiplierBps, "auto");
        return {
          betId: bet.id,
          playerId: bet.playerId.value,
          multiplierBps,
          payoutCents: payout.cents,
          cashoutTrigger: "auto" as const,
          autoCashoutMultiplierBps: bet.autoCashoutMultiplierBps,
        };
      });
  }

  crash(): void {
    if (this.statusValue !== "running") {
      throw new DomainError("Round can only crash while running");
    }

    this.statusValue = "crashed";
    this.bets.forEach((bet) => bet.lose());
  }

  settle(): void {
    if (this.statusValue !== "crashed") {
      throw new DomainError("Round can only settle after crash");
    }

    this.statusValue = "settled";
  }

  toSnapshot(): RoundSnapshot {
    return {
      id: this.id,
      status: this.statusValue,
      crashMultiplierBps: this.crashPoint.multiplierBps,
      serverSeedHash: this.serverSeedHash,
      nonce: this.nonce,
      bets: this.bets.map((bet) => bet.toSnapshot()),
    };
  }
}

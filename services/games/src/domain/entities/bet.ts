import { DomainError } from "../errors/domain-error";
import { Money } from "../value-objects/money";
import { PlayerId } from "../value-objects/player-id";

export type BetStatus = "pending" | "cashed_out" | "lost";
export type CashoutTrigger = "manual" | "auto";

export const AUTO_CASHOUT_MIN_BPS = 11000;
export const AUTO_CASHOUT_MAX_BPS = 1000000;

export interface BetSnapshot {
  id: string;
  playerId: string;
  amountCents: number;
  status: BetStatus;
  ready?: boolean;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  autoCashoutMultiplierBps?: number;
  cashoutTrigger?: CashoutTrigger;
}

export class Bet {
  private statusValue: BetStatus = "pending";
  private readyValue = false;
  private cashoutMultiplierValue?: number;
  private payoutValue?: Money;
  private cashoutTriggerValue?: CashoutTrigger;

  private constructor(
    public readonly id: string,
    public readonly playerId: PlayerId,
    public readonly amount: Money,
    private readonly autoCashoutMultiplierValue?: number,
  ) {}

  static create(
    id: string,
    playerId: PlayerId,
    amount: Money,
    autoCashoutMultiplierBps?: number | null,
  ): Bet {
    if (amount.cents < 100 || amount.cents > 100000) {
      throw new DomainError("Bet amount must be between 1.00 and 1000.00");
    }

    const autoCashoutMultiplier = Bet.normalizeAutoCashoutMultiplier(autoCashoutMultiplierBps);

    return new Bet(id, playerId, amount, autoCashoutMultiplier);
  }

  static rehydrate(snapshot: BetSnapshot): Bet {
    const bet = new Bet(
      snapshot.id,
      PlayerId.from(snapshot.playerId),
      Money.fromCents(snapshot.amountCents),
      snapshot.autoCashoutMultiplierBps,
    );
    bet.statusValue = snapshot.status;
    bet.readyValue = snapshot.ready ?? false;
    bet.cashoutMultiplierValue = snapshot.cashoutMultiplierBps;
    bet.cashoutTriggerValue = snapshot.cashoutTrigger;
    bet.payoutValue =
      snapshot.payoutCents === undefined ? undefined : Money.fromCents(snapshot.payoutCents);
    return bet;
  }

  get status(): BetStatus {
    return this.statusValue;
  }

  get ready(): boolean {
    return this.readyValue;
  }

  get autoCashoutMultiplierBps(): number | undefined {
    return this.autoCashoutMultiplierValue;
  }

  markReady(): void {
    if (this.statusValue !== "pending") {
      throw new DomainError("Only pending bets can be marked ready");
    }

    this.readyValue = true;
  }

  cashOut(multiplierBps: number, trigger: CashoutTrigger = "manual"): Money {
    if (this.statusValue !== "pending") {
      throw new DomainError("Bet is not pending");
    }

    this.statusValue = "cashed_out";
    this.cashoutMultiplierValue = multiplierBps;
    this.cashoutTriggerValue = trigger;
    this.payoutValue = this.amount.multiplyByMultiplierBps(multiplierBps);
    return this.payoutValue;
  }

  lose(): void {
    if (this.statusValue === "pending") {
      this.statusValue = "lost";
    }
  }

  belongsTo(playerId: PlayerId): boolean {
    return this.playerId.equals(playerId);
  }

  canAutoCashOut(currentMultiplierBps: number, crashMultiplierBps: number): boolean {
    return (
      this.statusValue === "pending" &&
      this.autoCashoutMultiplierValue !== undefined &&
      this.autoCashoutMultiplierValue <= currentMultiplierBps &&
      this.autoCashoutMultiplierValue < crashMultiplierBps
    );
  }

  static normalizeAutoCashoutMultiplier(value?: number | null): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (
      !Number.isInteger(value) ||
      value < AUTO_CASHOUT_MIN_BPS ||
      value > AUTO_CASHOUT_MAX_BPS
    ) {
      throw new DomainError("Auto cashout multiplier must be between 1.10x and 100.00x");
    }

    return value;
  }

  toSnapshot(): BetSnapshot {
    return {
      id: this.id,
      playerId: this.playerId.value,
      amountCents: this.amount.cents,
      status: this.statusValue,
      ready: this.readyValue,
      cashoutMultiplierBps: this.cashoutMultiplierValue,
      payoutCents: this.payoutValue?.cents,
      autoCashoutMultiplierBps: this.autoCashoutMultiplierValue,
      cashoutTrigger: this.cashoutTriggerValue,
    };
  }
}

import { DomainError } from "../errors/domain-error";
import { Money } from "../value-objects/money";
import { PlayerId } from "../value-objects/player-id";

export type BetStatus = "pending" | "cashed_out" | "lost";

export interface BetSnapshot {
  id: string;
  playerId: string;
  amountCents: number;
  status: BetStatus;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
}

export class Bet {
  private statusValue: BetStatus = "pending";
  private cashoutMultiplierValue?: number;
  private payoutValue?: Money;

  private constructor(
    public readonly id: string,
    public readonly playerId: PlayerId,
    public readonly amount: Money,
  ) {}

  static create(id: string, playerId: PlayerId, amount: Money): Bet {
    if (amount.cents < 100 || amount.cents > 100000) {
      throw new DomainError("Bet amount must be between 1.00 and 1000.00");
    }

    return new Bet(id, playerId, amount);
  }

  static rehydrate(snapshot: BetSnapshot): Bet {
    const bet = new Bet(
      snapshot.id,
      PlayerId.from(snapshot.playerId),
      Money.fromCents(snapshot.amountCents),
    );
    bet.statusValue = snapshot.status;
    bet.cashoutMultiplierValue = snapshot.cashoutMultiplierBps;
    bet.payoutValue =
      snapshot.payoutCents === undefined ? undefined : Money.fromCents(snapshot.payoutCents);
    return bet;
  }

  get status(): BetStatus {
    return this.statusValue;
  }

  cashOut(multiplierBps: number): Money {
    if (this.statusValue !== "pending") {
      throw new DomainError("Bet is not pending");
    }

    this.statusValue = "cashed_out";
    this.cashoutMultiplierValue = multiplierBps;
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

  toSnapshot(): BetSnapshot {
    return {
      id: this.id,
      playerId: this.playerId.value,
      amountCents: this.amount.cents,
      status: this.statusValue,
      cashoutMultiplierBps: this.cashoutMultiplierValue,
      payoutCents: this.payoutValue?.cents,
    };
  }
}

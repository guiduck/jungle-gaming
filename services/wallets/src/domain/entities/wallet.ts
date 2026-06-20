import { DomainError } from "../errors/domain-error";
import { Money } from "../value-objects/money";
import { PlayerId } from "../value-objects/player-id";

export type WalletOperationType = "debit_bet" | "credit_payout" | "seed_credit";
export type WalletOperationStatus = "accepted" | "rejected";

export interface WalletOperationSnapshot {
  idempotencyKey: string;
  type: WalletOperationType;
  amountCents: number;
  status: WalletOperationStatus;
  reason?: string;
}

export interface WalletSnapshot {
  id: string;
  playerId: string;
  balanceCents: number;
  operations: WalletOperationSnapshot[];
}

export class Wallet {
  private balance: Money;
  private readonly operations = new Map<string, WalletOperationSnapshot>();

  constructor(
    public readonly id: string,
    public readonly playerId: PlayerId,
    initialBalance = Money.fromCents(0),
  ) {
    this.balance = initialBalance;
  }

  get balanceCents(): number {
    return this.balance.cents;
  }

  debit(idempotencyKey: string, amount: Money): WalletOperationSnapshot {
    const previous = this.operations.get(idempotencyKey);

    if (previous) {
      return previous;
    }

    if (this.balance.cents < amount.cents) {
      const rejected = this.record(idempotencyKey, "debit_bet", amount, "rejected", "insufficient_balance");
      return rejected;
    }

    this.balance = Money.fromCents(this.balance.cents - amount.cents);
    return this.record(idempotencyKey, "debit_bet", amount, "accepted");
  }

  credit(
    idempotencyKey: string,
    amount: Money,
    type: WalletOperationType = "credit_payout",
  ): WalletOperationSnapshot {
    const previous = this.operations.get(idempotencyKey);

    if (previous) {
      return previous;
    }

    this.balance = Money.fromCents(this.balance.cents + amount.cents);
    return this.record(idempotencyKey, type, amount, "accepted");
  }

  private record(
    idempotencyKey: string,
    type: WalletOperationType,
    amount: Money,
    status: WalletOperationStatus,
    reason?: string,
  ): WalletOperationSnapshot {
    if (idempotencyKey.trim().length === 0) {
      throw new DomainError("Idempotency key is required");
    }

    const operation = {
      idempotencyKey,
      type,
      amountCents: amount.cents,
      status,
      reason,
    };

    this.operations.set(idempotencyKey, operation);
    return operation;
  }

  toSnapshot(): WalletSnapshot {
    return {
      id: this.id,
      playerId: this.playerId.value,
      balanceCents: this.balance.cents,
      operations: [...this.operations.values()],
    };
  }
}

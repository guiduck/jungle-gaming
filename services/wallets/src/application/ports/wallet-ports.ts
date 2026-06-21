import type { Wallet } from "../../domain";

export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
export const WALLET_OPERATION_REPOSITORY = Symbol("WALLET_OPERATION_REPOSITORY");
export const WALLET_RESULT_PUBLISHER = Symbol("WALLET_RESULT_PUBLISHER");
export const WALLET_CLOCK = Symbol("WALLET_CLOCK");
export const WALLET_ID_GENERATOR = Symbol("WALLET_ID_GENERATOR");

export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<Wallet | undefined>;
  save(wallet: Wallet): Promise<void>;
}

export interface WalletOperationRecord {
  idempotencyKey: string;
  playerId: string;
  type: "debit_bet" | "credit_payout" | "seed_credit";
  amountCents: number;
  status: "accepted" | "rejected";
  reason?: string;
  recordedAt: string;
}

export interface WalletOperationRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<WalletOperationRecord | undefined>;
  record(operation: WalletOperationRecord): Promise<WalletOperationRecord>;
  recordWalletMutation(
    wallet: Wallet,
    operation: WalletOperationRecord,
  ): Promise<WalletOperationRecord>;
}

export interface WalletResultPublisher {
  publish(operation: WalletOperationRecord): void | Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface WalletEffectCommand {
  idempotencyKey: string;
  playerId: string;
  amountCents: number;
}

import type { Round, RoundSnapshot } from "../../domain";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
export const GAME_EVENT_PUBLISHER = Symbol("GAME_EVENT_PUBLISHER");
export const GAME_WALLET_GATEWAY = Symbol("GAME_WALLET_GATEWAY");
export const GAME_CLOCK = Symbol("GAME_CLOCK");
export const GAME_ID_GENERATOR = Symbol("GAME_ID_GENERATOR");
export const GAME_MESSAGE_RECEIPT_REPOSITORY = Symbol("GAME_MESSAGE_RECEIPT_REPOSITORY");

export interface VerificationFormulaMetadata {
  commitmentAlgorithm: "sha256";
  crashAlgorithm: "hmac-sha256";
  multiplierScale: "basis_points";
}

export interface CompletedRoundRecord {
  id: string;
  crashMultiplierBps: number;
  serverSeedHash: string;
  serverSeed: string;
  nonce: string;
  houseEdgeBps: number;
  formula: VerificationFormulaMetadata;
  crashedAt: string;
}

export interface RoundRepository {
  getCurrent(): Promise<Round>;
  getActive(): Promise<Round[]>;
  saveCurrent(round: Round): Promise<void>;
  createNext(): Promise<Round>;
  addCompleted(round: CompletedRoundRecord): Promise<void>;
  getHistory(limit: number): Promise<CompletedRoundRecord[]>;
  getCompleted(roundId: string): Promise<CompletedRoundRecord | undefined>;
  getPlayerRoundSnapshots(playerId: string, limit: number): Promise<RoundSnapshot[]>;
}

export interface GameEventPublisher {
  publish(eventName: string, payload: Record<string, unknown>): void;
}

export interface WalletEffectRequest {
  idempotencyKey: string;
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: number;
  occurredAt: string;
}

export interface WalletPayoutRequest extends WalletEffectRequest {
  cashoutMultiplierBps: number;
}

export interface WalletEffectResult {
  status: "accepted" | "rejected" | "timeout";
  idempotencyKey: string;
  reason?: string;
}

export interface GameWalletGateway {
  requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult>;
  requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult>;
}

export interface GameMessageReceiptRepository {
  has(idempotencyKey: string): Promise<boolean>;
  record(idempotencyKey: string, messageType: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
}

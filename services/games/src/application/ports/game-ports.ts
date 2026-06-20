import type { Round, RoundSnapshot } from "../../domain";

export const ROUND_REPOSITORY = Symbol("ROUND_REPOSITORY");
export const GAME_EVENT_PUBLISHER = Symbol("GAME_EVENT_PUBLISHER");
export const GAME_WALLET_GATEWAY = Symbol("GAME_WALLET_GATEWAY");
export const GAME_CLOCK = Symbol("GAME_CLOCK");
export const GAME_ID_GENERATOR = Symbol("GAME_ID_GENERATOR");

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
  getCurrent(): Round;
  saveCurrent(round: Round): void;
  createNext(): Round;
  addCompleted(round: CompletedRoundRecord): void;
  getHistory(limit: number): CompletedRoundRecord[];
  getCompleted(roundId: string): CompletedRoundRecord | undefined;
  getPlayerRoundSnapshots(playerId: string, limit: number): RoundSnapshot[];
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

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export type RoundStatus = "betting" | "running" | "crashed" | "settled";

export interface Bet {
  id: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  ready?: boolean;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  autoCashoutMultiplierBps?: number;
  cashoutTrigger?: "manual" | "auto";
}

export interface Round {
  id: string;
  status: RoundStatus;
  crashMultiplierBps: number;
  bets: Bet[];
}

export interface CompletedRound {
  id: string;
  crashMultiplierBps: number;
  serverSeedHash: string;
  serverSeed: string;
  nonce: string;
  houseEdgeBps: number;
  formula: {
    commitmentAlgorithm: "sha256";
    crashAlgorithm: "hmac-sha256";
    multiplierScale: "basis_points";
  };
  crashedAt: string;
}

export interface RoundNotableBet {
  betId: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  autoCashoutMultiplierBps?: number;
  cashoutTrigger?: "manual" | "auto";
}

export interface RoundHistorySummary {
  id: string;
  crashMultiplierBps: number;
  crashedAt: string;
  settledAt?: string;
  acceptedBetCount: number;
  cashedOutBetCount: number;
  lostBetCount: number;
  totalWageredCents: number;
  totalPayoutCents: number;
  verificationAvailable: boolean;
  notableBets: RoundNotableBet[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: number;
  payoutCents: number;
  cashoutMultiplierBps: number;
  cashoutTrigger?: "manual" | "auto";
  autoCashoutMultiplierBps?: number;
  crashMultiplierBps: number;
  crashedAt: string;
}

export interface LeaderboardResponse {
  metric: "payout" | "multiplier";
  items: LeaderboardEntry[];
}

export interface PlayerBetHistoryEntry {
  roundId: string;
  betId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  crashMultiplierBps: number;
  autoCashoutMultiplierBps?: number;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  cashoutTrigger?: "manual" | "auto";
  crashedAt?: string;
}

export interface ItemsResponse<T> {
  items: T[];
}

export interface Wallet {
  id: string;
  playerId: string;
  balanceCents: number;
}

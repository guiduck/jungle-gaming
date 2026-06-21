export type RoundStatus = "betting" | "running" | "crashed" | "settled";

export interface Bet {
  id: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
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

export interface ItemsResponse<T> {
  items: T[];
}

export interface Wallet {
  id: string;
  playerId: string;
  balanceCents: number;
}

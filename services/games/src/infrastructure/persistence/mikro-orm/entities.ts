export class RoundEntity {
  id!: string;
  status!: "betting" | "running" | "crashed" | "settled";
  crashMultiplierBps!: number;
  houseEdgeBps!: number;
  serverSeedHash!: string;
  serverSeed?: string;
  nonce!: string;
  createdAt!: Date;
  updatedAt!: Date;
  crashedAt?: Date;
  settledAt?: Date;
  bets?: Set<BetEntity>;
}

export class BetEntity {
  id!: string;
  round!: RoundEntity;
  playerId!: string;
  amountCents!: number;
  status!: "pending" | "cashed_out" | "lost";
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  walletOperationKey!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class GameMessageReceiptEntity {
  idempotencyKey!: string;
  messageType!: string;
  processedAt!: Date;
}

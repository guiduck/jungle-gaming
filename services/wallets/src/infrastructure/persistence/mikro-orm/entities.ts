export class WalletEntity {
  id!: string;
  playerId!: string;
  balanceCents!: number;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
  operations?: Set<WalletOperationEntity>;
}

export class WalletOperationEntity {
  id!: string;
  idempotencyKey!: string;
  wallet!: WalletEntity;
  type!: "debit_bet" | "credit_payout" | "seed_credit";
  amountCents!: number;
  status!: "accepted" | "rejected";
  reason?: string;
  sourceRoundId?: string;
  sourceBetId?: string;
  createdAt!: Date;
}

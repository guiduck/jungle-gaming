import { EntitySchema } from "@mikro-orm/core";
import { WalletEntity, WalletOperationEntity } from "./entities";

export const walletSchema = new EntitySchema<any>({
  class: WalletEntity,
  tableName: "wallets",
  properties: {
    id: { type: "string", primary: true },
    playerId: { type: "string", fieldName: "player_id", unique: true },
    balanceCents: { type: "number", fieldName: "balance_cents" },
    version: { type: "number" },
    createdAt: { type: "Date", fieldName: "created_at" },
    updatedAt: { type: "Date", fieldName: "updated_at" },
    operations: { kind: "1:m", entity: () => WalletOperationEntity, mappedBy: "wallet" },
  },
});

export const walletOperationSchema = new EntitySchema<any>({
  class: WalletOperationEntity,
  tableName: "wallet_operations",
  properties: {
    id: { type: "string", primary: true },
    idempotencyKey: { type: "string", fieldName: "idempotency_key", unique: true },
    wallet: { kind: "m:1", entity: () => WalletEntity, fieldName: "wallet_id" },
    type: { type: "string" },
    amountCents: { type: "number", fieldName: "amount_cents" },
    status: { type: "string" },
    reason: { type: "string", nullable: true },
    sourceRoundId: { type: "string", fieldName: "source_round_id", nullable: true },
    sourceBetId: { type: "string", fieldName: "source_bet_id", nullable: true },
    createdAt: { type: "Date", fieldName: "created_at" },
  },
});

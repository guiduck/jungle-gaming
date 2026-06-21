import { EntitySchema } from "@mikro-orm/core";
import { BetEntity, GameMessageReceiptEntity, RoundEntity } from "./entities";

export const roundSchema = new EntitySchema<any>({
  class: RoundEntity,
  tableName: "rounds",
  properties: {
    id: { type: "string", primary: true },
    status: { type: "string" },
    crashMultiplierBps: { type: "number", fieldName: "crash_multiplier_bps" },
    houseEdgeBps: { type: "number", fieldName: "house_edge_bps" },
    serverSeedHash: { type: "string", fieldName: "server_seed_hash" },
    serverSeed: { type: "string", fieldName: "server_seed", nullable: true },
    nonce: { type: "string" },
    createdAt: { type: "Date", fieldName: "created_at" },
    updatedAt: { type: "Date", fieldName: "updated_at" },
    crashedAt: { type: "Date", fieldName: "crashed_at", nullable: true },
    settledAt: { type: "Date", fieldName: "settled_at", nullable: true },
    bets: { kind: "1:m", entity: () => BetEntity, mappedBy: "round" },
  },
});

export const betSchema = new EntitySchema<any>({
  class: BetEntity,
  tableName: "bets",
  properties: {
    id: { type: "string", primary: true },
    round: { kind: "m:1", entity: () => RoundEntity, fieldName: "round_id" },
    playerId: { type: "string", fieldName: "player_id" },
    amountCents: { type: "number", fieldName: "amount_cents" },
    status: { type: "string" },
    cashoutMultiplierBps: {
      type: "number",
      fieldName: "cashout_multiplier_bps",
      nullable: true,
    },
    payoutCents: { type: "number", fieldName: "payout_cents", nullable: true },
    autoCashoutMultiplierBps: {
      type: "number",
      fieldName: "auto_cashout_multiplier_bps",
      nullable: true,
    },
    cashoutTrigger: { type: "string", fieldName: "cashout_trigger", nullable: true },
    walletOperationKey: { type: "string", fieldName: "wallet_operation_key" },
    createdAt: { type: "Date", fieldName: "created_at" },
    updatedAt: { type: "Date", fieldName: "updated_at" },
  },
  indexes: [{ name: "bets_round_player_idx", properties: ["round", "playerId"] }],
});

export const gameMessageReceiptSchema = new EntitySchema<any>({
  class: GameMessageReceiptEntity,
  tableName: "game_message_receipts",
  properties: {
    idempotencyKey: { type: "string", primary: true, fieldName: "idempotency_key" },
    messageType: { type: "string", fieldName: "message_type" },
    processedAt: { type: "Date", fieldName: "processed_at" },
  },
});

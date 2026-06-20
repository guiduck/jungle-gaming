export const WalletEvents = {
  BetDebitRequested: "wallet.bet_debit_requested",
  BetDebitAccepted: "wallet.bet_debit_accepted",
  BetDebitRejected: "wallet.bet_debit_rejected",
  PayoutCreditRequested: "wallet.payout_credit_requested",
  PayoutCreditAccepted: "wallet.payout_credit_accepted",
  PayoutCreditRejected: "wallet.payout_credit_rejected",
} as const;

export type WalletEventName = (typeof WalletEvents)[keyof typeof WalletEvents];

export interface WalletEventBase {
  eventId: string;
  idempotencyKey: string;
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: number;
  occurredAt: string;
}

export interface WalletRejectedEvent extends WalletEventBase {
  reason: string;
}

export interface WalletBetDebitRequestedEvent extends WalletEventBase {
  eventName: typeof WalletEvents.BetDebitRequested;
}

export interface WalletPayoutCreditRequestedEvent extends WalletEventBase {
  eventName: typeof WalletEvents.PayoutCreditRequested;
  cashoutMultiplierBps: number;
}

export interface WalletBetDebitAcceptedEvent extends WalletEventBase {
  eventName: typeof WalletEvents.BetDebitAccepted;
}

export interface WalletBetDebitRejectedEvent extends WalletRejectedEvent {
  eventName: typeof WalletEvents.BetDebitRejected;
}

export interface WalletPayoutCreditAcceptedEvent extends WalletEventBase {
  eventName: typeof WalletEvents.PayoutCreditAccepted;
}

export interface WalletPayoutCreditRejectedEvent extends WalletRejectedEvent {
  eventName: typeof WalletEvents.PayoutCreditRejected;
}

export type WalletRequestEvent =
  | WalletBetDebitRequestedEvent
  | WalletPayoutCreditRequestedEvent;

export type WalletResultEvent =
  | WalletBetDebitAcceptedEvent
  | WalletBetDebitRejectedEvent
  | WalletPayoutCreditAcceptedEvent
  | WalletPayoutCreditRejectedEvent;

export const GameSocketEvents = {
  RoundBettingOpened: "round.betting_opened",
  RoundStarted: "round.started",
  RoundMultiplier: "round.multiplier",
  RoundCrashed: "round.crashed",
  RoundSettled: "round.settled",
  BetAccepted: "bet.accepted",
  CashoutAccepted: "cashout.accepted",
  CashoutRejected: "cashout.rejected",
  HistoryUpdated: "history.updated",
} as const;

export type GameSocketEventName =
  (typeof GameSocketEvents)[keyof typeof GameSocketEvents];

export interface GameSocketPayload {
  eventId: string;
  roundId: string;
  serverTime: string;
  sequence?: number;
  data: Record<string, unknown>;
}

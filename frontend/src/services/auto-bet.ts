import type { Bet } from "../types";

export type AutoBetStrategy = "fixed" | "martingale";

export interface AutoBetConfig {
  enabled: boolean;
  strategy: AutoBetStrategy;
  baseAmountCents: number;
  currentAmountCents: number;
  stopLossCents: number;
  accumulatedLossCents: number;
}

export const AUTO_BET_MIN_AMOUNT_CENTS = 100;
export const AUTO_BET_MAX_AMOUNT_CENTS = 100000;

export const DEFAULT_AUTO_BET_CONFIG: AutoBetConfig = {
  enabled: false,
  strategy: "fixed",
  baseAmountCents: 100,
  currentAmountCents: 100,
  stopLossCents: 1000,
  accumulatedLossCents: 0,
};

export function clampAutoBetAmount(amountCents: number): number {
  if (!Number.isFinite(amountCents)) {
    return AUTO_BET_MIN_AMOUNT_CENTS;
  }

  return Math.min(
    AUTO_BET_MAX_AMOUNT_CENTS,
    Math.max(AUTO_BET_MIN_AMOUNT_CENTS, Math.round(amountCents / 100) * 100),
  );
}

export function settleAutoBet(config: AutoBetConfig, bet: Bet): AutoBetConfig {
  if (bet.status === "pending") {
    return config;
  }

  const profitCents =
    bet.status === "cashed_out" ? (bet.payoutCents ?? 0) - bet.amountCents : -bet.amountCents;
  const accumulatedLossCents = Math.max(0, config.accumulatedLossCents - profitCents);
  const reachedStopLoss = accumulatedLossCents >= config.stopLossCents;
  const nextAmountCents =
    config.strategy === "martingale" && profitCents < 0
      ? clampAutoBetAmount(config.currentAmountCents * 2)
      : config.baseAmountCents;

  return {
    ...config,
    enabled: config.enabled && !reachedStopLoss,
    accumulatedLossCents,
    currentAmountCents: reachedStopLoss ? config.baseAmountCents : nextAmountCents,
  };
}

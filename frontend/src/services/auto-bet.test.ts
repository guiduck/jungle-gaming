import { describe, expect, test } from "vitest";
import {
  DEFAULT_AUTO_BET_CONFIG,
  clampAutoBetAmount,
  settleAutoBet,
  type AutoBetConfig,
} from "./auto-bet";
import type { Bet } from "../types";

const baseBet: Bet = {
  id: "bet-1",
  playerId: "player-1",
  amountCents: 100,
  status: "pending",
};

const enabledMartingale: AutoBetConfig = {
  ...DEFAULT_AUTO_BET_CONFIG,
  enabled: true,
  strategy: "martingale",
  baseAmountCents: 100,
  currentAmountCents: 100,
  stopLossCents: 700,
};

describe("auto-bet strategy helpers", () => {
  test("clamps stakes to supported bet cents", () => {
    expect(clampAutoBetAmount(10)).toBe(100);
    expect(clampAutoBetAmount(149)).toBe(100);
    expect(clampAutoBetAmount(151)).toBe(200);
    expect(clampAutoBetAmount(200000)).toBe(100000);
  });

  test("doubles the next stake after a martingale loss", () => {
    const next = settleAutoBet(enabledMartingale, { ...baseBet, status: "lost" });

    expect(next.enabled).toBe(true);
    expect(next.currentAmountCents).toBe(200);
    expect(next.accumulatedLossCents).toBe(100);
  });

  test("resets the stake after a win recovers accumulated loss", () => {
    const next = settleAutoBet(
      { ...enabledMartingale, currentAmountCents: 400, accumulatedLossCents: 300 },
      { ...baseBet, amountCents: 400, status: "cashed_out", payoutCents: 800 },
    );

    expect(next.enabled).toBe(true);
    expect(next.currentAmountCents).toBe(100);
    expect(next.accumulatedLossCents).toBe(0);
  });

  test("disables auto bet when stop-loss is reached", () => {
    const next = settleAutoBet(
      { ...enabledMartingale, currentAmountCents: 400, accumulatedLossCents: 300 },
      { ...baseBet, amountCents: 400, status: "lost" },
    );

    expect(next.enabled).toBe(false);
    expect(next.currentAmountCents).toBe(100);
    expect(next.accumulatedLossCents).toBe(700);
  });
});

import { describe, expect, test } from "vitest";
import { betOutcomeLabel, formatCents, shortPlayerId } from "./read-model-display";

describe("read-model display helpers", () => {
  test("formats shortened player ids", () => {
    expect(shortPlayerId("")).toBe("desconhecido");
    expect(shortPlayerId("player-1")).toBe("player-1");
    expect(shortPlayerId("1234567890abcdef")).toBe("12345678...");
  });

  test("formats bet outcome labels", () => {
    expect(betOutcomeLabel({ status: "lost" })).toBe("perdida");
    expect(betOutcomeLabel({ status: "cashed_out", cashoutTrigger: "manual" })).toBe("saque manual");
    expect(betOutcomeLabel({ status: "cashed_out", cashoutTrigger: "auto" })).toBe("saque automatico");
    expect(betOutcomeLabel({ status: "pending", autoCashoutMultiplierBps: 15000 })).toBe("auto @ 1.50x");
    expect(betOutcomeLabel({ status: "" })).toBe("indisponivel");
  });

  test("formats cents without changing the integer cent source", () => {
    expect(formatCents(0)).toBe("R$ 0,00");
    expect(formatCents(375)).toBe("R$ 3,75");
  });
});

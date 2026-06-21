import { describe, expect, test } from "vitest";
import {
  AUTO_CASHOUT_MAX_BPS,
  AUTO_CASHOUT_MIN_BPS,
  formatMultiplierBps,
  parseMultiplierInputToBps,
} from "./auto-cashout";

describe("auto-cashout helpers", () => {
  test("formats multiplier basis points", () => {
    expect(formatMultiplierBps(15000)).toBe("1.50x");
  });

  test("parses bounded multiplier input to basis points", () => {
    expect(parseMultiplierInputToBps("1.10")).toBe(AUTO_CASHOUT_MIN_BPS);
    expect(parseMultiplierInputToBps("1.50x")).toBe(15000);
    expect(parseMultiplierInputToBps("100")).toBe(AUTO_CASHOUT_MAX_BPS);
  });

  test("rejects invalid auto-cashout multiplier input", () => {
    expect(parseMultiplierInputToBps("")).toBeNull();
    expect(parseMultiplierInputToBps("1.00")).toBeNull();
    expect(parseMultiplierInputToBps("100.01")).toBeNull();
    expect(parseMultiplierInputToBps("nope")).toBeNull();
  });
});

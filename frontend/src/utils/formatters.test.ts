import { describe, expect, test } from "vitest";
import { revealedCrashPointLabel } from "./formatters";

describe("formatters", () => {
  test("hides the crash point before the round crashes", () => {
    expect(revealedCrashPointLabel("betting", 25000)).toBe("oculto ate o crash");
    expect(revealedCrashPointLabel("running", 25000)).toBe("oculto ate o crash");
  });

  test("reveals the crash point after crash or settlement", () => {
    expect(revealedCrashPointLabel("crashed", 25000)).toBe("2.50x");
    expect(revealedCrashPointLabel("settled", 25000)).toBe("2.50x");
  });

  test("shows an empty placeholder when crash point is unknown", () => {
    expect(revealedCrashPointLabel("settled", undefined)).toBe("...");
  });
});

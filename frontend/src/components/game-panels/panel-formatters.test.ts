import { describe, expect, test } from "vitest";
import { revealedCrashPointLabel } from "./panel-formatters";

describe("panel formatters", () => {
  test("hides the crash point until the round has crashed", () => {
    expect(revealedCrashPointLabel("betting", 46624)).toBe("oculto ate o crash");
    expect(revealedCrashPointLabel("running", 46624)).toBe("oculto ate o crash");
  });

  test("reveals the crash point after the round is terminal", () => {
    expect(revealedCrashPointLabel("crashed", 46624)).toBe("4.66x");
    expect(revealedCrashPointLabel("settled", 46624)).toBe("4.66x");
  });
});

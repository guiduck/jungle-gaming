import { describe, expect, test, vi } from "vitest";
import { createTelemetryEmitter, formatFrontendEvent } from "./telemetry";

describe("frontend telemetry", () => {
  test("formats stable single-line frontend events and omits undefined fields", () => {
    expect(formatFrontendEvent("round.viewed", {
      roundId: "round-1",
      amountCents: 250,
      ignored: undefined,
    })).toBe("event=round.viewed service=frontend roundId=round-1 amountCents=250");
  });

  test("emits to the selected console level", () => {
    const target = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const emit = createTelemetryEmitter(target);

    emit({ event: "api.request.failed", level: "warn", fields: { status: 503 } });

    expect(target.warn).toHaveBeenCalledWith("event=api.request.failed service=frontend status=503");
    expect(target.info).not.toHaveBeenCalled();
    expect(target.error).not.toHaveBeenCalled();
  });
});

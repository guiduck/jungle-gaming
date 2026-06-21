import { describe, expect, test } from "bun:test";
import { formatLogEvent } from "../../../src/infrastructure/system/log-event";

describe("formatLogEvent", () => {
  test("renders stable single-line fields and omits undefined values", () => {
    expect(formatLogEvent("round.started", {
      roundId: "round-1",
      amountCents: 250,
      reason: undefined,
    })).toBe("event=round.started service=games roundId=round-1 amountCents=250");
  });
});

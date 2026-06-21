import { describe, expect, test } from "bun:test";
import { formatLogEvent } from "../../../src/infrastructure/system/log-event";

describe("formatLogEvent", () => {
  test("renders stable single-line fields and omits undefined values", () => {
    expect(formatLogEvent("wallet.debit.recorded", {
      playerId: "player-1",
      amountCents: 250,
      reason: undefined,
    })).toBe("event=wallet.debit.recorded service=wallets playerId=player-1 amountCents=250");
  });
});

import { describe, expect, test } from "bun:test";
import { CrashPoint, Money, PlayerId, Round } from "../../../src/domain";

function createRound(): Round {
  return new Round("round-1", CrashPoint.fromBasisPoints(20000), "hash", "nonce");
}

describe("Round and Bet", () => {
  test("accepts one bet per player during betting", () => {
    const round = createRound();
    const player = PlayerId.from("player");

    round.placeBet("bet-1", player, Money.fromCents(100));

    expect(round.toSnapshot().bets).toHaveLength(1);
    expect(() => round.placeBet("bet-2", player, Money.fromCents(200))).toThrow(
      "already has a bet",
    );
  });

  test("rejects invalid bet amounts", () => {
    const round = createRound();
    const player = PlayerId.from("player");

    expect(() => round.placeBet("bet-1", player, Money.fromCents(99))).toThrow(
      "between 1.00 and 1000.00",
    );
    expect(() => round.placeBet("bet-2", player, Money.fromCents(100001))).toThrow(
      "between 1.00 and 1000.00",
    );
  });

  test("moves through lifecycle and settles lost pending bets", () => {
    const round = createRound();
    round.placeBet("bet-1", PlayerId.from("player"), Money.fromCents(100));

    round.start();
    round.crash();
    round.settle();

    expect(round.toSnapshot().status).toBe("settled");
    expect(round.toSnapshot().bets[0]?.status).toBe("lost");
  });

  test("cashout succeeds before crash and cannot happen twice", () => {
    const round = createRound();
    const player = PlayerId.from("player");
    round.placeBet("bet-1", player, Money.fromCents(100));
    round.start();

    const payout = round.cashOut(player, 15000);

    expect(payout.cents).toBe(150);
    expect(round.toSnapshot().bets[0]?.status).toBe("cashed_out");
    expect(() => round.cashOut(player, 16000)).toThrow("not pending");
  });

  test("cashout after crash point is rejected by server truth", () => {
    const round = createRound();
    const player = PlayerId.from("player");
    round.placeBet("bet-1", player, Money.fromCents(100));
    round.start();

    expect(() => round.cashOut(player, 20000)).toThrow("after crash");
  });
});

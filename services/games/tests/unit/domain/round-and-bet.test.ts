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
    expect(round.toSnapshot().bets[0]?.cashoutTrigger).toBe("manual");
    expect(() => round.cashOut(player, 16000)).toThrow("not pending");
  });

  test("cashout after crash point is rejected by server truth", () => {
    const round = createRound();
    const player = PlayerId.from("player");
    round.placeBet("bet-1", player, Money.fromCents(100));
    round.start();

    expect(() => round.cashOut(player, 20000)).toThrow("after crash");
  });

  test("validates auto-cashout target bounds", () => {
    const player = PlayerId.from("player");

    expect(() => createRound().placeBet("bet-min", player, Money.fromCents(100), 11000)).not.toThrow();
    expect(() => createRound().placeBet("bet-max", player, Money.fromCents(100), 1000000)).not.toThrow();
    expect(() => createRound().placeBet("bet-low", player, Money.fromCents(100), 10999)).toThrow(
      "Auto cashout multiplier",
    );
    expect(() => createRound().placeBet("bet-high", player, Money.fromCents(100), 1000001)).toThrow(
      "Auto cashout multiplier",
    );
    expect(() => createRound().placeBet("bet-float", player, Money.fromCents(100), 11000.5)).toThrow(
      "Auto cashout multiplier",
    );
  });

  test("keeps manual-only behavior when auto-cashout target is absent or null", () => {
    const player = PlayerId.from("player");
    const absent = createRound();
    const nullable = createRound();

    absent.placeBet("bet-absent", player, Money.fromCents(100));
    nullable.placeBet("bet-null", player, Money.fromCents(100), null);

    expect(absent.toSnapshot().bets[0]?.autoCashoutMultiplierBps).toBeUndefined();
    expect(nullable.toSnapshot().bets[0]?.autoCashoutMultiplierBps).toBeUndefined();
  });

  test("auto-cashout below crash records target trigger and integer payout", () => {
    const round = createRound();
    round.placeBet("bet-1", PlayerId.from("player"), Money.fromCents(250), 15000);
    round.start();

    const results = round.autoCashOutEligibleBets(15500);
    const bet = round.toSnapshot().bets[0];

    expect(results).toEqual([{
      betId: "bet-1",
      playerId: "player",
      multiplierBps: 15000,
      payoutCents: 375,
      cashoutTrigger: "auto",
      autoCashoutMultiplierBps: 15000,
    }]);
    expect(bet?.status).toBe("cashed_out");
    expect(bet?.cashoutMultiplierBps).toBe(15000);
    expect(bet?.cashoutTrigger).toBe("auto");
    expect(bet?.payoutCents).toBe(375);
  });

  test("auto-cashout target equal to crash loses at the boundary", () => {
    const round = createRound();
    round.placeBet("bet-1", PlayerId.from("player"), Money.fromCents(100), 20000);
    round.start();

    expect(round.autoCashOutEligibleBets(20000)).toHaveLength(0);
    round.crash();

    expect(round.toSnapshot().bets[0]?.status).toBe("lost");
  });

  test("manual and auto cashout share one pending transition", () => {
    const player = PlayerId.from("player");
    const manualFirst = createRound();
    manualFirst.placeBet("bet-manual", player, Money.fromCents(100), 15000);
    manualFirst.start();
    manualFirst.cashOut(player, 12000);

    expect(manualFirst.autoCashOutEligibleBets(15000)).toHaveLength(0);
    expect(manualFirst.toSnapshot().bets[0]?.cashoutTrigger).toBe("manual");

    const autoFirst = createRound();
    autoFirst.placeBet("bet-auto", player, Money.fromCents(100), 15000);
    autoFirst.start();
    autoFirst.autoCashOutEligibleBets(15000);

    expect(() => autoFirst.cashOut(player, 16000)).toThrow("not pending");
    expect(autoFirst.toSnapshot().bets[0]?.cashoutTrigger).toBe("auto");
  });
});

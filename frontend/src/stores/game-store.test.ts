import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./game-store";
import type { Round } from "../types";

const bettingRound: Round = {
  id: "round-1",
  status: "betting",
  crashMultiplierBps: 25000,
  bets: [],
};

describe("game-store socket synchronization", () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: "betting",
      displayedMultiplierBps: 10000,
      authoritativeMultiplierBps: 10000,
      targetMultiplierBps: 10000,
      cashoutState: "idle",
      socketStatus: "disconnected",
      round: undefined,
    });
  });

  it("turns the current betting round into running as soon as a multiplier tick arrives", () => {
    useGameStore.getState().setRound(bettingRound);

    useGameStore.getState().applyMultiplierTick("round-1", 12000);

    const state = useGameStore.getState();
    expect(state.phase).toBe("running");
    expect(state.round?.status).toBe("running");
    expect(state.authoritativeMultiplierBps).toBe(12000);
    expect(state.targetMultiplierBps).toBe(12000);
    expect(state.displayedMultiplierBps).toBe(10000);
  });

  it("ignores multiplier ticks from stale rounds", () => {
    useGameStore.getState().setRound(bettingRound);

    useGameStore.getState().applyMultiplierTick("old-round", 50000);

    const state = useGameStore.getState();
    expect(state.phase).toBe("betting");
    expect(state.round?.status).toBe("betting");
    expect(state.authoritativeMultiplierBps).toBe(10000);
  });
});

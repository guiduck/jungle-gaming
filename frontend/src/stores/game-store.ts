import { create } from "zustand";
import type { Round, RoundStatus } from "../types";

interface GameStore {
  phase: RoundStatus;
  displayedMultiplierBps: number;
  authoritativeMultiplierBps: number;
  targetMultiplierBps: number;
  cashoutState: "idle" | "pending" | "accepted" | "rejected";
  socketStatus: "connecting" | "connected" | "disconnected";
  round?: Round;
  setRound: (round: Round) => void;
  applyMultiplierTick: (roundId: string, multiplierBps: number) => void;
  setDisplayedMultiplierBps: (multiplierBps: number) => void;
  setAuthoritativeMultiplierBps: (multiplierBps: number) => void;
  setTargetMultiplierBps: (multiplierBps: number) => void;
  setCashoutState: (state: GameStore["cashoutState"]) => void;
  setSocketStatus: (state: GameStore["socketStatus"]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: "betting",
  displayedMultiplierBps: 10000,
  authoritativeMultiplierBps: 10000,
  targetMultiplierBps: 10000,
  cashoutState: "idle",
  socketStatus: "disconnected",
  setRound: (round) =>
    set((state) => {
      const isSameRound = state.round?.id === round.id;
      const shouldPreserveMultiplier =
        isSameRound && (round.status === "running" || round.status === "crashed");
      const displayedMultiplierBps = round.status === "crashed"
        ? Math.max(state.displayedMultiplierBps, round.crashMultiplierBps)
        : shouldPreserveMultiplier
          ? Math.max(state.displayedMultiplierBps, 10000)
          : 10000;
      const authoritativeMultiplierBps = shouldPreserveMultiplier
        ? Math.max(state.authoritativeMultiplierBps, displayedMultiplierBps)
        : 10000;
      const targetMultiplierBps = shouldPreserveMultiplier
        ? Math.max(state.targetMultiplierBps, displayedMultiplierBps, authoritativeMultiplierBps)
        : displayedMultiplierBps;

      return {
        round,
        phase: round.status,
        displayedMultiplierBps,
        authoritativeMultiplierBps,
        targetMultiplierBps,
      };
    }),
  applyMultiplierTick: (roundId, multiplierBps) =>
    set((state) => {
      if (state.round?.id !== roundId) {
        return state;
      }

      const authoritativeMultiplierBps = Math.max(
        state.authoritativeMultiplierBps,
        multiplierBps,
        10000,
      );
      const round = state.round.status === "running"
        ? state.round
        : { ...state.round, status: "running" as const };

      return {
        round,
        phase: "running",
        authoritativeMultiplierBps,
        targetMultiplierBps: Math.max(state.targetMultiplierBps, authoritativeMultiplierBps),
      };
    }),
  setDisplayedMultiplierBps: (displayedMultiplierBps) => set({ displayedMultiplierBps }),
  setAuthoritativeMultiplierBps: (authoritativeMultiplierBps) =>
    set((state) => ({
      authoritativeMultiplierBps,
      targetMultiplierBps: Math.max(state.targetMultiplierBps, authoritativeMultiplierBps),
    })),
  setTargetMultiplierBps: (targetMultiplierBps) => set({ targetMultiplierBps }),
  setCashoutState: (cashoutState) => set({ cashoutState }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
}));

import { create } from "zustand";
import type { Round, RoundStatus } from "../types";

interface GameStore {
  phase: RoundStatus;
  displayedMultiplierBps: number;
  cashoutState: "idle" | "pending" | "accepted" | "rejected";
  socketStatus: "connecting" | "connected" | "disconnected";
  round?: Round;
  setRound: (round: Round) => void;
  setDisplayedMultiplierBps: (multiplierBps: number) => void;
  setCashoutState: (state: GameStore["cashoutState"]) => void;
  setSocketStatus: (state: GameStore["socketStatus"]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: "betting",
  displayedMultiplierBps: 10000,
  cashoutState: "idle",
  socketStatus: "disconnected",
  setRound: (round) =>
    set({
      round,
      phase: round.status,
      displayedMultiplierBps: Math.max(10000, round.status === "running" ? 12000 : 10000),
    }),
  setDisplayedMultiplierBps: (displayedMultiplierBps) => set({ displayedMultiplierBps }),
  setCashoutState: (cashoutState) => set({ cashoutState }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
}));

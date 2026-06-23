import { useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_PATH, SOCKET_URL } from "../services/api";
import { logFrontendEvent } from "../services/telemetry";
import { useGameStore } from "../stores/game-store";
import type { Round } from "../types";
import { logGameEvent } from "./game-telemetry";

export function useGameSocket(refresh: () => Promise<void>): void {
  const setRound = useGameStore((state) => state.setRound);
  const setCashoutState = useGameStore((state) => state.setCashoutState);
  const applyMultiplierTick = useGameStore((state) => state.applyMultiplierTick);
  const setSocketStatus = useGameStore((state) => state.setSocketStatus);

  useEffect(() => {
    setSocketStatus("connecting");
    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const refreshFromEvent = () => {
      void refresh();
    };
    const applyRoundPayload = (payload: { round?: Round }) => {
      if (payload.round) {
        setRound(payload.round);
      }
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      logGameEvent("socket.connected");
      refreshFromEvent();
    });
    socket.on("disconnect", (reason) => {
      setSocketStatus("disconnected");
      logFrontendEvent("socket.disconnected", { reason }, "warn");
    });
    socket.on("connect_error", (error) => {
      setSocketStatus("disconnected");
      logFrontendEvent("socket.connect_error", { reason: error.message }, "warn");
    });
    socket.on("round.multiplier", (payload: { roundId?: string; multiplierBps?: number }) => {
      if (typeof payload.roundId === "string" && typeof payload.multiplierBps === "number") {
        applyMultiplierTick(payload.roundId, payload.multiplierBps);
      }
    });
    socket.on("round.betting.opened", (payload: { round?: Round }) => {
      logGameEvent("socket.event.received", { socketEvent: "round.betting.opened" });
      applyRoundPayload(payload);
      refreshFromEvent();
    });
    socket.on("round.started", (payload: { round?: Round; roundId?: string }) => {
      logGameEvent("socket.event.received", { socketEvent: "round.started" });
      applyRoundPayload(payload);
      if (!payload.round && typeof payload.roundId === "string") {
        applyMultiplierTick(payload.roundId, 10000);
      }
      refreshFromEvent();
    });
    socket.on("round.crashed", (payload: { round?: Round }) => {
      logGameEvent("socket.event.received", { socketEvent: "round.crashed" });
      applyRoundPayload(payload);
      refreshFromEvent();
    });
    socket.on("round.settled", (payload: { round?: Round }) => {
      logGameEvent("socket.event.received", { socketEvent: "round.settled" });
      applyRoundPayload(payload);
      refreshFromEvent();
    });
    socket.on("history.updated", () => {
      logGameEvent("socket.event.received", { socketEvent: "history.updated" });
      refreshFromEvent();
    });
    socket.on("bet.accepted", () => {
      logGameEvent("socket.event.received", { socketEvent: "bet.accepted" });
      refreshFromEvent();
    });
    socket.on("bet.ready", (payload: { round?: Round }) => {
      logGameEvent("socket.event.received", { socketEvent: "bet.ready" });
      applyRoundPayload(payload);
      refreshFromEvent();
    });
    socket.on("cashout.accepted", () => {
      logGameEvent("socket.event.received", { socketEvent: "cashout.accepted" });
      setCashoutState("accepted");
      refreshFromEvent();
    });
    socket.on("cashout.rejected", () => {
      logFrontendEvent("socket.event.received", { socketEvent: "cashout.rejected" }, "warn");
      setCashoutState("rejected");
      refreshFromEvent();
    });

    return () => {
      socket.disconnect();
    };
  }, [
    applyMultiplierTick,
    refresh,
    setCashoutState,
    setRound,
    setSocketStatus,
  ]);
}

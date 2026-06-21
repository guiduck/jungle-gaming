import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import {
  cashOut,
  crashRound,
  createWallet,
  getCurrentRound,
  getMyBets,
  getRoundHistory,
  getRoundVerification,
  getWallet,
  placeBet,
  SOCKET_URL,
  settleRound,
  startRound,
} from "../services/api";
import { logFrontendEvent } from "../services/telemetry";
import { useGameStore } from "../stores/game-store";

const logGameEvent = (event: string, fields: Record<string, string | number | boolean | undefined> = {}) =>
  logFrontendEvent(event, fields);

export function useGame() {
  const queryClient = useQueryClient();
  const setRound = useGameStore((state) => state.setRound);
  const setCashoutState = useGameStore((state) => state.setCashoutState);
  const setDisplayedMultiplierBps = useGameStore((state) => state.setDisplayedMultiplierBps);
  const setSocketStatus = useGameStore((state) => state.setSocketStatus);

  const roundQuery = useQuery({
    queryKey: ["round"],
    queryFn: getCurrentRound,
    refetchInterval: 3000,
  });

  const walletQuery = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      try {
        return await getWallet();
      } catch {
        return createWallet();
      }
    },
  });

  const historyQuery = useQuery({
    queryKey: ["round-history"],
    queryFn: getRoundHistory,
    refetchInterval: 5000,
  });

  const myBetsQuery = useQuery({
    queryKey: ["my-bets"],
    queryFn: getMyBets,
    refetchInterval: 5000,
  });

  const latestCompletedRoundId = historyQuery.data?.items[0]?.id;
  const verificationQuery = useQuery({
    queryKey: ["round-verification", latestCompletedRoundId],
    queryFn: () => getRoundVerification(latestCompletedRoundId ?? ""),
    enabled: Boolean(latestCompletedRoundId),
  });

  useEffect(() => {
    if (roundQuery.data) {
      setRound(roundQuery.data);
    }
  }, [roundQuery.data, setRound]);

  const refresh = async () => {
    logGameEvent("game.refresh.started");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["round"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["round-history"] }),
      queryClient.invalidateQueries({ queryKey: ["my-bets"] }),
    ]);
    logGameEvent("game.refresh.completed");
  };

  useEffect(() => {
    setSocketStatus("connecting");
    const socket = io(SOCKET_URL, {
      path: "/games/socket",
      transports: ["websocket"],
      reconnection: true,
    });

    const refreshFromEvent = () => {
      void refresh();
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
    socket.on("round.multiplier", (payload: { multiplierBps?: number }) => {
      if (typeof payload.multiplierBps === "number") {
        setDisplayedMultiplierBps(payload.multiplierBps);
      }
    });
    socket.on("round.betting_opened", () => {
      logGameEvent("socket.event.received", { socketEvent: "round.betting_opened" });
      refreshFromEvent();
    });
    socket.on("round.started", () => {
      logGameEvent("socket.event.received", { socketEvent: "round.started" });
      refreshFromEvent();
    });
    socket.on("round.crashed", () => {
      logGameEvent("socket.event.received", { socketEvent: "round.crashed" });
      refreshFromEvent();
    });
    socket.on("round.settled", () => {
      logGameEvent("socket.event.received", { socketEvent: "round.settled" });
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
    queryClient,
    setCashoutState,
    setDisplayedMultiplierBps,
    setSocketStatus,
  ]);

  return {
    roundQuery,
    walletQuery,
    historyQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation: useMutation({
      mutationFn: placeBet,
      onMutate: (amountCents) => {
        logGameEvent("bet.submit.started", { amountCents });
      },
      onSuccess: async (round) => {
        logGameEvent("bet.submit.accepted", { roundId: round.id, status: round.status });
        setRound(round);
        await refresh();
      },
      onError: (error) => {
        logFrontendEvent("bet.submit.rejected", {
          reason: error instanceof Error ? error.message : String(error),
        }, "warn");
      },
    }),
    cashoutMutation: useMutation({
      mutationFn: cashOut,
      onMutate: (multiplierBps) => {
        logGameEvent("cashout.submit.started", { multiplierBps });
        setCashoutState("pending");
      },
      onSuccess: async (round) => {
        logGameEvent("cashout.submit.accepted", { roundId: round.id, status: round.status });
        setRound(round);
        setCashoutState("accepted");
        await refresh();
      },
      onError: (error) => {
        logFrontendEvent("cashout.submit.rejected", {
          reason: error instanceof Error ? error.message : String(error),
        }, "warn");
        setCashoutState("rejected");
      },
    }),
    startMutation: useMutation({
      mutationFn: startRound,
      onSuccess: (round) => {
        logGameEvent("round.manual_start.accepted", { roundId: round.id });
        setRound(round);
      },
    }),
    crashMutation: useMutation({
      mutationFn: crashRound,
      onSuccess: (round) => {
        logGameEvent("round.manual_crash.accepted", { roundId: round.id });
        setRound(round);
      },
    }),
    settleMutation: useMutation({
      mutationFn: settleRound,
      onSuccess: (round) => {
        logGameEvent("round.manual_settle.accepted", { roundId: round.id });
        setRound(round);
      },
    }),
  };
}

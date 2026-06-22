import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  cashOut,
  crashRound,
  createWallet,
  getCurrentRound,
  getLeaderboard,
  getMyBets,
  getRoundHistory,
  getRoundVerification,
  getWallet,
  markBetReady,
  placeBet,
  SOCKET_PATH,
  SOCKET_URL,
  settleRound,
  startRound,
} from "../services/api";
import { logFrontendEvent } from "../services/telemetry";
import { useGameStore } from "../stores/game-store";
import type { Round } from "../types";

const logGameEvent = (event: string, fields: Record<string, string | number | boolean | undefined> = {}) =>
  logFrontendEvent(event, fields);
const RUNNER_MULTIPLIER_BPS_PER_MS = 750 / 250;

export function useGame() {
  const queryClient = useQueryClient();
  const setRound = useGameStore((state) => state.setRound);
  const setCashoutState = useGameStore((state) => state.setCashoutState);
  const applyMultiplierTick = useGameStore((state) => state.applyMultiplierTick);
  const setDisplayedMultiplierBps = useGameStore((state) => state.setDisplayedMultiplierBps);
  const setSocketStatus = useGameStore((state) => state.setSocketStatus);
  const phase = useGameStore((state) => state.phase);
  const displayedMultiplierBps = useGameStore((state) => state.displayedMultiplierBps);
  const targetMultiplierBps = useGameStore((state) => state.targetMultiplierBps);
  const round = useGameStore((state) => state.round);
  const displayedMultiplierRef = useRef(displayedMultiplierBps);
  const targetMultiplierRef = useRef(targetMultiplierBps);
  const phaseRef = useRef(phase);
  const runningRoundIdRef = useRef<string | undefined>(undefined);
  const runningStartedAtRef = useRef<number | undefined>(undefined);

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

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", "payout"],
    queryFn: () => getLeaderboard("payout"),
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
    displayedMultiplierRef.current = displayedMultiplierBps;
  }, [displayedMultiplierBps]);

  useEffect(() => {
    targetMultiplierRef.current = targetMultiplierBps;
  }, [targetMultiplierBps]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      queryClient.invalidateQueries({ queryKey: ["my-bets"] }),
    ]);
    logGameEvent("game.refresh.completed");
  };

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
    const applyRoundPayload = (payload: { round?: Round }) => {
      if (payload.round) {
        setRound(payload.round);
      }
    };

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
    queryClient,
    applyMultiplierTick,
    setCashoutState,
    setRound,
    setSocketStatus,
  ]);

  useEffect(() => {
    if (phase !== "running") {
      runningRoundIdRef.current = undefined;
      runningStartedAtRef.current = undefined;
      return;
    }

    if (runningRoundIdRef.current !== round?.id) {
      runningRoundIdRef.current = round?.id;
      runningStartedAtRef.current = performance.now();
    }

    let animationFrame = 0;
    let previousTimestamp = performance.now();
    let currentMultiplierBps = displayedMultiplierRef.current;

    const animate = (timestamp: number) => {
      const elapsedMs = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      const visualCeilingBps = Math.max(10000, round?.crashMultiplierBps ?? 10000);
      const elapsedRunningMs = Math.max(0, timestamp - (runningStartedAtRef.current ?? timestamp));
      const fallbackTargetBps = Math.min(
        visualCeilingBps,
        10000 + Math.floor(elapsedRunningMs * RUNNER_MULTIPLIER_BPS_PER_MS),
      );
      const animationTargetBps = Math.min(
        visualCeilingBps,
        Math.max(10000, targetMultiplierRef.current, fallbackTargetBps),
      );
      const remainingBps = animationTargetBps - currentMultiplierBps;

      if (remainingBps > 0) {
        const interpolation = Math.min(1, elapsedMs / 140);
        currentMultiplierBps = Math.min(
          animationTargetBps,
          currentMultiplierBps + Math.max(1, Math.round(remainingBps * interpolation)),
        );
      }

      setDisplayedMultiplierBps(currentMultiplierBps);

      if (phaseRef.current === "running") {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [
    phase,
    round?.id,
    round?.crashMultiplierBps,
    setDisplayedMultiplierBps,
  ]);

  return {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation: useMutation({
      mutationFn: (input: { amountCents: number; autoCashoutMultiplierBps?: number | null }) =>
        placeBet(input.amountCents, input.autoCashoutMultiplierBps),
      onMutate: ({ amountCents, autoCashoutMultiplierBps }) => {
        logGameEvent("bet.submit.started", {
          amountCents,
          autoCashoutMultiplierBps: autoCashoutMultiplierBps ?? undefined,
        });
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
    readyMutation: useMutation({
      mutationFn: markBetReady,
      onSuccess: async (round) => {
        logGameEvent("bet.ready.accepted", { roundId: round.id, status: round.status });
        setRound(round);
        await refresh();
      },
      onError: (error) => {
        logFrontendEvent("bet.ready.rejected", {
          reason: error instanceof Error ? error.message : String(error),
        }, "warn");
      },
    }),
    startMutation: useMutation({
      mutationFn: startRound,
      onSuccess: async (round) => {
        logGameEvent("round.manual_start.accepted", { roundId: round.id });
        setRound(round);
        await refresh();
      },
    }),
    crashMutation: useMutation({
      mutationFn: crashRound,
      onSuccess: async (round) => {
        logGameEvent("round.manual_crash.accepted", { roundId: round.id });
        setRound(round);
        await refresh();
      },
    }),
    settleMutation: useMutation({
      mutationFn: settleRound,
      onSuccess: async (round) => {
        logGameEvent("round.manual_settle.accepted", { roundId: round.id });
        setRound(round);
        await refresh();
      },
    }),
  };
}

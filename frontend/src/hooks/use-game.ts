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
import { useGameStore } from "../stores/game-store";

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["round"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["round-history"] }),
      queryClient.invalidateQueries({ queryKey: ["my-bets"] }),
    ]);
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
      refreshFromEvent();
    });
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => setSocketStatus("disconnected"));
    socket.on("round.multiplier", (payload: { multiplierBps?: number }) => {
      if (typeof payload.multiplierBps === "number") {
        setDisplayedMultiplierBps(payload.multiplierBps);
      }
    });
    socket.on("round.betting_opened", refreshFromEvent);
    socket.on("round.started", refreshFromEvent);
    socket.on("round.crashed", refreshFromEvent);
    socket.on("round.settled", refreshFromEvent);
    socket.on("history.updated", refreshFromEvent);
    socket.on("bet.accepted", refreshFromEvent);
    socket.on("cashout.accepted", () => {
      setCashoutState("accepted");
      refreshFromEvent();
    });
    socket.on("cashout.rejected", () => {
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
      onSuccess: async (round) => {
        setRound(round);
        await refresh();
      },
    }),
    cashoutMutation: useMutation({
      mutationFn: cashOut,
      onMutate: () => setCashoutState("pending"),
      onSuccess: async (round) => {
        setRound(round);
        setCashoutState("accepted");
        await refresh();
      },
      onError: () => setCashoutState("rejected"),
    }),
    startMutation: useMutation({ mutationFn: startRound, onSuccess: setRound }),
    crashMutation: useMutation({ mutationFn: crashRound, onSuccess: setRound }),
    settleMutation: useMutation({ mutationFn: settleRound, onSuccess: setRound }),
  };
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import {
  createWallet,
  getCurrentRound,
  getLeaderboard,
  getMyBets,
  getRoundHistory,
  getRoundVerification,
  getWallet,
} from "../services/api";
import { useGameStore } from "../stores/game-store";
import { logGameEvent } from "./game-telemetry";

export function useGameQueries() {
  const queryClient = useQueryClient();
  const setRound = useGameStore((state) => state.setRound);

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
    if (roundQuery.data) {
      setRound(roundQuery.data);
    }
  }, [roundQuery.data, setRound]);

  const refresh = useCallback(async () => {
    logGameEvent("game.refresh.started");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["round"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["round-history"] }),
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      queryClient.invalidateQueries({ queryKey: ["my-bets"] }),
    ]);
    logGameEvent("game.refresh.completed");
  }, [queryClient]);

  return {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    refresh,
  };
}

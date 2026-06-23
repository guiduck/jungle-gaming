import { useMutation } from "@tanstack/react-query";
import { cashOut, markBetReady, placeBet } from "../services/api";
import { logFrontendEvent } from "../services/telemetry";
import { useGameStore } from "../stores/game-store";
import { logGameEvent } from "./game-telemetry";

export function useGameMutations(refresh: () => Promise<void>) {
  const setRound = useGameStore((state) => state.setRound);
  const setCashoutState = useGameStore((state) => state.setCashoutState);

  const placeBetMutation = useMutation({
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
  });

  const cashoutMutation = useMutation({
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
  });

  const readyMutation = useMutation({
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
  });

  return {
    placeBetMutation,
    cashoutMutation,
    readyMutation,
  };
}

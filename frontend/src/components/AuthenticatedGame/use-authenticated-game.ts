import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_AUTO_BET_CONFIG,
  clampAutoBetAmount,
  settleAutoBet,
  type AutoBetConfig,
  type AutoBetStrategy,
} from "../../services/auto-bet";
import { parseMultiplierInputToBps } from "../../services/auto-cashout";
import { getCurrentPlayerId } from "../../services/auth";
import { useDialogueStore } from "../../stores/dialogue-store";
import { useGameStore } from "../../stores/game-store";
import { useGame } from "../../hooks/use-game";
import { useGameDialogue } from "../../hooks/use-game-dialogue";
import { useGameShortcuts } from "../../hooks/use-game-shortcuts";

const BALANCE_VISIBLE_KEY = "jungle.walletBalanceVisible";

function readBalanceVisibility(): boolean {
  return localStorage.getItem(BALANCE_VISIBLE_KEY) !== "false";
}

export function useAuthenticatedGame() {
  const [amountCents, setAmountCents] = useState(100);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState("1.50");
  const [autoBetConfig, setAutoBetConfig] = useState<AutoBetConfig>(DEFAULT_AUTO_BET_CONFIG);
  const [showCommands, setShowCommands] = useState(false);
  const [showBalance, setShowBalance] = useState(readBalanceVisibility);
  const autoSubmittedRoundIdRef = useRef<string | undefined>(undefined);
  const autoReadyBetIdRef = useRef<string | undefined>(undefined);
  const settledAutoBetIdRef = useRef<string | undefined>(undefined);
  const {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation,
    cashoutMutation,
    readyMutation,
  } = useGame();
  const round = useGameStore((state) => state.round);
  const cashoutState = useGameStore((state) => state.cashoutState);
  const socketStatus = useGameStore((state) => state.socketStatus);
  const authoritativeMultiplierBps = useGameStore((state) => state.authoritativeMultiplierBps);
  const forceCloseDialogue = useDialogueStore((state) => state.forceClose);
  const playerId = getCurrentPlayerId();
  const myBet = useMemo(
    () => round?.bets.find((bet) => bet.playerId === playerId),
    [playerId, round],
  );
  const playerBetState = myBet?.status ?? "none";
  const autoCashoutMultiplierBps = autoCashoutEnabled
    ? parseMultiplierInputToBps(autoCashoutTarget)
    : undefined;
  const hasAcceptedBet = Boolean(myBet);
  const myBetNeedsReady = round?.status === "betting" && Boolean(myBet) && !myBet?.ready;

  const placeCurrentBet = useCallback(() => {
    if (
      round?.status !== "betting" ||
      hasAcceptedBet ||
      placeBetMutation.isPending ||
      (autoCashoutEnabled && autoCashoutMultiplierBps === null)
    ) {
      return;
    }

    placeBetMutation.mutate({
      amountCents,
      autoCashoutMultiplierBps: autoCashoutMultiplierBps ?? null,
    });
  }, [
    amountCents,
    autoCashoutEnabled,
    autoCashoutMultiplierBps,
    hasAcceptedBet,
    placeBetMutation,
    round?.status,
  ]);

  const onBet = (event: FormEvent) => {
    event.preventDefault();
    placeCurrentBet();
  };

  const setAutoBetEnabled = (enabled: boolean) => {
    setAutoBetConfig((config) => ({
      ...config,
      enabled,
      baseAmountCents: clampAutoBetAmount(amountCents),
      currentAmountCents: enabled ? clampAutoBetAmount(amountCents) : config.currentAmountCents,
    }));
  };

  const setAutoBetStrategy = (strategy: AutoBetStrategy) => {
    setAutoBetConfig((config) => ({ ...config, strategy }));
  };

  const setAutoBetStopLoss = (stopLossCents: number) => {
    setAutoBetConfig((config) => ({
      ...config,
      stopLossCents: clampAutoBetAmount(stopLossCents),
    }));
  };

  const cashoutCurrentBet = useCallback(() => {
    if (round?.status !== "running" || !myBet || myBet.status !== "pending") {
      return;
    }

    cashoutMutation.mutate(authoritativeMultiplierBps);
  }, [authoritativeMultiplierBps, cashoutMutation, myBet, round?.status]);

  useGameDialogue({
    cashoutState,
    playerBetState,
    round,
    onOpenCommands: () => setShowCommands(true),
  });

  useGameShortcuts({
    canToggleAutoCashout: !hasAcceptedBet,
    isCommandModalOpen: showCommands,
    onCashout: cashoutCurrentBet,
    onCloseCommands: () => setShowCommands(false),
    onDecreaseBet: () => setAmountCents((value) => Math.max(100, value - 100)),
    onForceCloseDialogue: forceCloseDialogue,
    onIncreaseBet: () => setAmountCents((value) => Math.min(100000, value + 100)),
    onSubmitBet: placeCurrentBet,
    onToggleAutoCashout: () => setAutoCashoutEnabled((enabled) => !enabled),
    onToggleCommands: () => setShowCommands((isOpen) => !isOpen),
  });

  useEffect(() => {
    if (!myBet || myBet.status === "pending" || settledAutoBetIdRef.current === myBet.id) {
      return;
    }

    settledAutoBetIdRef.current = myBet.id;
    setAutoBetConfig((config) => (config.enabled ? settleAutoBet(config, myBet) : config));
  }, [myBet]);

  useEffect(() => {
    if (
      !autoBetConfig.enabled ||
      round?.status !== "betting" ||
      hasAcceptedBet ||
      placeBetMutation.isPending ||
      autoSubmittedRoundIdRef.current === round.id ||
      (autoCashoutEnabled && autoCashoutMultiplierBps === null)
    ) {
      return;
    }

    autoSubmittedRoundIdRef.current = round.id;
    setAmountCents(autoBetConfig.currentAmountCents);
    placeBetMutation.mutate({
      amountCents: autoBetConfig.currentAmountCents,
      autoCashoutMultiplierBps: autoCashoutMultiplierBps ?? null,
    });
  }, [
    autoBetConfig.currentAmountCents,
    autoBetConfig.enabled,
    autoCashoutEnabled,
    autoCashoutMultiplierBps,
    hasAcceptedBet,
    placeBetMutation,
    round?.id,
    round?.status,
  ]);

  useEffect(() => {
    if (
      !autoBetConfig.enabled ||
      !myBetNeedsReady ||
      !myBet ||
      readyMutation.isPending ||
      autoReadyBetIdRef.current === myBet.id
    ) {
      return;
    }

    autoReadyBetIdRef.current = myBet.id;
    readyMutation.mutate();
  }, [autoBetConfig.enabled, myBet, myBetNeedsReady, readyMutation]);

  const toggleBalanceVisibility = () => {
    setShowBalance((isVisible) => {
      const nextValue = !isVisible;
      localStorage.setItem(BALANCE_VISIBLE_KEY, String(nextValue));
      return nextValue;
    });
  };

  return {
    amountCents,
    autoBetConfig,
    autoCashoutEnabled,
    autoCashoutMultiplierBps,
    autoCashoutTarget,
    authoritativeMultiplierBps,
    cashoutCurrentBet,
    cashoutState,
    hasAcceptedBet,
    history: historyQuery.data,
    isRoundLoading: roundQuery.isLoading,
    leaderboard: leaderboardQuery.data,
    myBet,
    myBetNeedsReady,
    myBets: myBetsQuery.data,
    placeBetError: placeBetMutation.isError ? placeBetMutation.error : undefined,
    placeBetPending: placeBetMutation.isPending,
    readyError: readyMutation.isError ? readyMutation.error : undefined,
    readyPending: readyMutation.isPending,
    round,
    showBalance,
    showCommands,
    socketStatus,
    verification: verificationQuery.data,
    wallet: walletQuery.data,
    onAmountChange: setAmountCents,
    onAutoBetEnabledChange: setAutoBetEnabled,
    onAutoBetStopLossChange: setAutoBetStopLoss,
    onAutoBetStrategyChange: setAutoBetStrategy,
    onAutoCashoutEnabledChange: setAutoCashoutEnabled,
    onAutoCashoutTargetChange: setAutoCashoutTarget,
    onBet,
    onCloseCommands: () => setShowCommands(false),
    onOpenCommands: () => setShowCommands(true),
    onReady: () => readyMutation.mutate(),
    onToggleBalance: toggleBalanceVisibility,
  };
}

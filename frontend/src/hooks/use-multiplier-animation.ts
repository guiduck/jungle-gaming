import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/game-store";

const RUNNER_MULTIPLIER_BPS_PER_MS = 750 / 250;

export function useMultiplierAnimation(): void {
  const phase = useGameStore((state) => state.phase);
  const displayedMultiplierBps = useGameStore((state) => state.displayedMultiplierBps);
  const targetMultiplierBps = useGameStore((state) => state.targetMultiplierBps);
  const round = useGameStore((state) => state.round);
  const setDisplayedMultiplierBps = useGameStore((state) => state.setDisplayedMultiplierBps);
  const displayedMultiplierRef = useRef(displayedMultiplierBps);
  const targetMultiplierRef = useRef(targetMultiplierBps);
  const phaseRef = useRef(phase);
  const runningRoundIdRef = useRef<string | undefined>(undefined);
  const runningStartedAtRef = useRef<number | undefined>(undefined);

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
}

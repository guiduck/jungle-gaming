import { useGameStore } from "../stores/game-store";

function formatMultiplier(multiplierBps: number): string {
  return `${(multiplierBps / 10000).toFixed(2)}x`;
}

export function GameScene() {
  const displayedMultiplierBps = useGameStore((state) => state.displayedMultiplierBps);
  const phase = useGameStore((state) => state.phase);
  const progress = Math.min(82, Math.max(8, (displayedMultiplierBps - 10000) / 300));
  const animation = phase === "running" ? "run" : phase === "crashed" ? "jump" : "idle";

  return (
    <section className="game-scene" aria-label="Crash multiplier scene">
      <div className="scene-header">
        <span>{phase.toUpperCase()}</span>
        <strong>{formatMultiplier(displayedMultiplierBps)}</strong>
      </div>
      <div className="mountain">
        <div className="path" />
        <div className={`goat ${phase}`} style={{ left: `${progress}%`, bottom: `${progress}%` }}>
          <span className={`goat-sprite ${animation}`} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

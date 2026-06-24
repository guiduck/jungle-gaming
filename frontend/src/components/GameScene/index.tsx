import type { CSSProperties } from "react";
import {
  pointsToMountainAreaPath,
  pointsToMountainTrailPath,
  projectCrashMountain,
} from "../../services/crash-mountain";
import { useGameStore } from "../../stores/game-store";
import { multiplier, scenePhaseLabel, scenePhaseMessage } from "../../utils/formatters";
import { MountainDebugPoints, SceneDebug } from "./SceneDebug";

function isSceneDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("debug") === "true";
}

export function GameScene() {
  const displayedMultiplierBps = useGameStore((state) => state.displayedMultiplierBps);
  const phase = useGameStore((state) => state.phase);
  const projection = projectCrashMountain(displayedMultiplierBps);
  const debugEnabled = isSceneDebugEnabled();
  const trailPath = pointsToMountainTrailPath(projection.revealedPathPoints);
  const mountainPath = pointsToMountainAreaPath(projection.revealedPathPoints);
  const animation = phase === "running" ? "run" : phase === "crashed" ? "jump" : "idle";
  const goatTransform = `translate(${projection.goatXPercent} ${100 - projection.goatYPercent}) rotate(${-projection.angleDeg})`;
  const mountainStyle = {
    "--mountain-zoom": projection.zoomScale.toFixed(3),
    "--mountain-pan-x": `${projection.panXPercent.toFixed(2)}%`,
    "--mountain-origin-x": `${projection.xPercent}%`,
    "--mountain-origin-y": `${100 - projection.yPercent}%`,
  } as CSSProperties;

  return (
    <section className="game-scene" aria-label="Crash multiplier scene" data-smoke="mountain-scene">
      <div className="scene-header">
        <span>{scenePhaseLabel(phase).toUpperCase()}</span>
        <strong>{multiplier(displayedMultiplierBps)}</strong>
      </div>
      <div className={`scene-feedback ${phase}`} role="status" aria-live="polite">
        {scenePhaseMessage(phase)}
      </div>
      <div className="mountain">
        <div className="mountain-world" style={mountainStyle}>
          <svg className="mountain-curve" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="revealedMountain" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#46f19c" stopOpacity="0.62" />
                <stop offset="58%" stopColor="#4d5b65" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#10131c" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path className="mountain-fill" d={mountainPath} />
            <path className="mountain-trail" d={trailPath} pathLength={1} />
            <g className={`goat-svg ${phase}`} transform={goatTransform}>
              <foreignObject className="goat-svg-frame" x="-3.15" y="-6.35" width="6.3" height="6.3">
                <div className={`goat-svg-sprite ${animation}`} aria-hidden="true" />
              </foreignObject>
            </g>
            {debugEnabled && <MountainDebugPoints projection={projection} />}
          </svg>
          {debugEnabled && <SceneDebug projection={projection} />}
        </div>
      </div>
    </section>
  );
}

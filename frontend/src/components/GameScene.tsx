import type { CSSProperties } from "react";
import {
  pointsToMountainAreaPath,
  pointsToMountainTrailPath,
  projectCrashMountain,
} from "../services/crash-mountain";
import { useGameStore } from "../stores/game-store";

function formatMultiplier(multiplierBps: number): string {
  return `${(multiplierBps / 10000).toFixed(2)}x`;
}

function formatPhaseMessage(phase: string): string {
  switch (phase) {
    case "betting":
      return "Trilha aberta";
    case "running":
      return "Cabra na subida";
    case "crashed":
      return "Crash na crista!";
    case "settled":
      return "Subida encerrada";
    default:
      return "Procurando a trilha";
  }
}

function formatPhaseLabel(phase: string): string {
  switch (phase) {
    case "betting":
      return "Apostas";
    case "running":
      return "Subindo";
    case "crashed":
      return "Crash";
    case "settled":
      return "Encerrada";
    default:
      return "Carregando";
  }
}

function isSceneDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("debug") === "true";
}

function formatDebugNumber(value: number): string {
  return value.toFixed(2);
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
  const debugStyle = {
    "--debug-x": `${projection.goatXPercent}%`,
    "--debug-y": `${100 - projection.goatYPercent}%`,
  } as CSSProperties;

  return (
    <section className="game-scene" aria-label="Crash multiplier scene" data-smoke="mountain-scene">
      <div className="scene-header">
        <span>{formatPhaseLabel(phase).toUpperCase()}</span>
        <strong>{formatMultiplier(displayedMultiplierBps)}</strong>
      </div>
      <div className={`scene-feedback ${phase}`} role="status" aria-live="polite">
        {formatPhaseMessage(phase)}
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
            {debugEnabled ? (
              <g className="mountain-debug-points">
                <line
                  x1={projection.goatXPercent}
                  y1={100 - projection.goatYPercent}
                  x2={projection.xPercent}
                  y2={100 - projection.yPercent}
                />
                <circle
                  className="goat-anchor"
                  cx={projection.goatXPercent}
                  cy={100 - projection.goatYPercent}
                  r="0.9"
                />
                <circle
                  className="line-anchor"
                  cx={projection.xPercent}
                  cy={100 - projection.yPercent}
                  r="0.9"
                />
              </g>
            ) : null}
          </svg>
          {debugEnabled ? (
            <div
              className="scene-debug"
              style={debugStyle}
              aria-label="Mountain projection debug"
            >
              <span>line x {formatDebugNumber(projection.xPercent)}</span>
              <span>line y {formatDebugNumber(projection.yPercent)}</span>
              <span>goat x {formatDebugNumber(projection.goatXPercent)}</span>
              <span>goat y {formatDebugNumber(projection.goatYPercent)}</span>
              <span>angle {formatDebugNumber(projection.angleDeg)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

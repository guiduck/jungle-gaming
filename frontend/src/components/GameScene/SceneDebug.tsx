import type { CSSProperties } from "react";
import type { CrashMountainProjection } from "../../services/crash-mountain";
import { debugNumber } from "../../utils/formatters";

interface SceneDebugProps {
  projection: CrashMountainProjection;
}

export function MountainDebugPoints({ projection }: SceneDebugProps) {
  return (
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
  );
}

export function SceneDebug({ projection }: SceneDebugProps) {
  const debugStyle = {
    "--debug-x": `${projection.goatXPercent}%`,
    "--debug-y": `${100 - projection.goatYPercent}%`,
  } as CSSProperties;

  return (
    <div className="scene-debug" style={debugStyle} aria-label="Mountain projection debug">
      <span>line x {debugNumber(projection.xPercent)}</span>
      <span>line y {debugNumber(projection.yPercent)}</span>
      <span>goat x {debugNumber(projection.goatXPercent)}</span>
      <span>goat y {debugNumber(projection.goatYPercent)}</span>
      <span>angle {debugNumber(projection.angleDeg)}</span>
    </div>
  );
}

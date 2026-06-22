export interface CurvePoint {
  xPercent: number;
  yPercent: number;
}

export interface CrashMountainOptions {
  visualMaxMultiplier: number;
  xStartPercent: number;
  xEndPercent: number;
  yStartPercent: number;
  yEndPercent: number;
  yCurveExponent: number;
  sampleCount: number;
  minAngleDeg: number;
  maxAngleDeg: number;
  frameWidth: number;
  frameHeight: number;
}

export interface CrashMountainProjection extends CurvePoint {
  angleDeg: number;
  goatXPercent: number;
  goatYPercent: number;
  panXPercent: number;
  pathPoints: CurvePoint[];
  revealedPathPoints: CurvePoint[];
  progressIndex: number;
  progress: number;
  zoomScale: number;
}

export const defaultCrashMountainOptions: CrashMountainOptions = {
  visualMaxMultiplier: 7,
  xStartPercent: 10,
  xEndPercent: 132,
  yStartPercent: 18,
  yEndPercent: 84,
  yCurveExponent: 1.08,
  sampleCount: 96,
  minAngleDeg: 0,
  maxAngleDeg: 36,
  frameWidth: 100,
  frameHeight: 54,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeOptions(options?: Partial<CrashMountainOptions>): CrashMountainOptions {
  const merged = { ...defaultCrashMountainOptions, ...options };
  return {
    ...merged,
    visualMaxMultiplier: Math.max(1.01, merged.visualMaxMultiplier),
    sampleCount: Math.max(2, Math.round(merged.sampleCount)),
    frameWidth: Math.max(1, merged.frameWidth),
    frameHeight: Math.max(1, merged.frameHeight),
  };
}

function normalizeMultiplier(multiplierBps: number, visualMaxMultiplier: number): number {
  if (!Number.isFinite(multiplierBps)) {
    return 1;
  }

  return clamp(multiplierBps / 10000, 1, visualMaxMultiplier);
}

function projectProgress(progress: number, options: CrashMountainOptions): CurvePoint {
  const clampedProgress = clamp(progress, 0, 1);
  const multiplier = multiplierForProgress(clampedProgress, options.visualMaxMultiplier);
  const yProgress = clamp(
    Math.pow((multiplier - 1) / (options.visualMaxMultiplier - 1), options.yCurveExponent),
    0,
    1,
  );

  return {
    xPercent:
      options.xStartPercent + (options.xEndPercent - options.xStartPercent) * clampedProgress,
    yPercent:
      options.yStartPercent + (options.yEndPercent - options.yStartPercent) * yProgress,
  };
}

function projectMultiplier(multiplier: number, options: CrashMountainOptions): CurvePoint {
  return projectProgress(
    progressForMultiplier(multiplier, options.visualMaxMultiplier),
    options,
  );
}

function progressForMultiplier(multiplier: number, visualMaxMultiplier: number): number {
  return clamp(Math.log(multiplier) / Math.log(visualMaxMultiplier), 0, 1);
}

function angleForProgress(progress: number, options: CrashMountainOptions): number {
  if (progress <= 0.04) {
    return 0;
  }

  const previous = projectProgress(progress - 0.004, options);
  const next = projectProgress(progress + 0.004, options);
  const dx = Math.max(0.0001, next.xPercent - previous.xPercent);
  const dy = next.yPercent - previous.yPercent;
  const angleDeg = (Math.atan2(options.frameHeight * dy, options.frameWidth * dx) * 180) / Math.PI;
  const easedAngle = angleDeg * Math.min(1, (progress - 0.04) / 0.22);
  return clamp(easedAngle, options.minAngleDeg, options.maxAngleDeg);
}

function sampledMultiplierAt(index: number, sampleCount: number, visualMaxMultiplier: number): number {
  const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
  return Math.exp(progress * Math.log(visualMaxMultiplier));
}

function buildPathPoints(options: CrashMountainOptions): CurvePoint[] {
  return Array.from({ length: options.sampleCount }, (_, index) =>
    projectMultiplier(
      sampledMultiplierAt(index, options.sampleCount, options.visualMaxMultiplier),
      options,
    ),
  );
}

function progressIndexFor(point: CurvePoint, pathPoints: CurvePoint[]): number {
  return pathPoints.reduce((closestIndex, candidate, candidateIndex) => {
    const currentDistance = Math.abs(pathPoints[closestIndex].xPercent - point.xPercent);
    const candidateDistance = Math.abs(candidate.xPercent - point.xPercent);
    return candidateDistance < currentDistance ? candidateIndex : closestIndex;
  }, 0);
}

function buildRevealedPathPoints(point: CurvePoint, pathPoints: CurvePoint[]): CurvePoint[] {
  const visiblePoints = pathPoints.filter(
    (pathPoint) => pathPoint.xPercent < point.xPercent - 0.01,
  );
  const lastVisiblePoint = visiblePoints[visiblePoints.length - 1];

  if (
    lastVisiblePoint &&
    Math.abs(lastVisiblePoint.xPercent - point.xPercent) < 0.01 &&
    Math.abs(lastVisiblePoint.yPercent - point.yPercent) < 0.01
  ) {
    return visiblePoints;
  }

  if (visiblePoints.length === 0) {
    return [
      point,
      {
        xPercent: Math.min(point.xPercent + 5, 100),
        yPercent: point.yPercent,
      },
    ];
  }

  return [...visiblePoints, point];
}

function multiplierForProgress(progress: number, visualMaxMultiplier: number): number {
  return Math.exp(progress * Math.log(visualMaxMultiplier));
}

function lineProgressFor(goatProgress: number): number {
  const lead = goatProgress < 0.08 ? 0.08 : 0.06;
  return clamp(goatProgress + lead, 0, 1);
}

function cameraLeftFor(linePoint: CurvePoint): number {
  const comfortableRightEdge = 90;
  return Math.max(0, linePoint.xPercent - comfortableRightEdge);
}

function zoomScaleFor(progress: number): number {
  const earlyZoom = 1.46;
  const lateZoom = 1.1;
  const zoomOutProgress = clamp(progress / 0.72, 0, 1);
  return earlyZoom - (earlyZoom - lateZoom) * zoomOutProgress;
}

function applyCamera(point: CurvePoint, cameraLeftPercent: number): CurvePoint {
  return {
    xPercent: point.xPercent - cameraLeftPercent,
    yPercent: point.yPercent,
  };
}

function visualDistanceBetween(
  from: CurvePoint,
  to: CurvePoint,
  options: CrashMountainOptions,
): number {
  const dx = (to.xPercent - from.xPercent) * options.frameWidth;
  const dy = (to.yPercent - from.yPercent) * options.frameHeight;
  return Math.hypot(dx, dy);
}

function interpolatePoint(from: CurvePoint, to: CurvePoint, ratio: number): CurvePoint {
  return {
    xPercent: from.xPercent + (to.xPercent - from.xPercent) * ratio,
    yPercent: from.yPercent + (to.yPercent - from.yPercent) * ratio,
  };
}

function pointBehindTip(
  points: CurvePoint[],
  distance: number,
  options: CrashMountainOptions,
): CurvePoint {
  if (points.length === 0) {
    return { xPercent: 0, yPercent: 0 };
  }

  if (points.length === 1) {
    return points[0];
  }

  let remaining = distance;

  for (let index = points.length - 1; index > 0; index -= 1) {
    const to = points[index];
    const from = points[index - 1];
    const segmentDistance = visualDistanceBetween(from, to, options);

    if (segmentDistance >= remaining) {
      const ratioFromTip = remaining / segmentDistance;
      return interpolatePoint(to, from, ratioFromTip);
    }

    remaining -= segmentDistance;
  }

  return points[0];
}

function angleBetweenPoints(
  from: CurvePoint,
  to: CurvePoint,
  options: CrashMountainOptions,
): number {
  const dx = Math.max(0.0001, (to.xPercent - from.xPercent) * options.frameWidth);
  const dy = (to.yPercent - from.yPercent) * options.frameHeight;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function goatProjectionFromPath(
  revealedPathPoints: CurvePoint[],
  progress: number,
  options: CrashMountainOptions,
): { point: CurvePoint; angleDeg: number } {
  const tip = revealedPathPoints[revealedPathPoints.length - 1] ?? {
    xPercent: options.xStartPercent,
    yPercent: options.yStartPercent,
  };

  if (progress <= 0.005) {
    return {
      point: {
        xPercent: options.xStartPercent,
        yPercent: options.yStartPercent,
      },
      angleDeg: 0,
    };
  }

  const goatBodyDelay = 7.5 * options.frameWidth;
  const angleLookaheadDelay = 2.5 * options.frameWidth;
  const point = pointBehindTip(revealedPathPoints, goatBodyDelay, options);
  const lookahead = pointBehindTip(revealedPathPoints, angleLookaheadDelay, options);
  const easedAngle = angleBetweenPoints(point, lookahead, options) * Math.min(1, progress / 0.2);

  return {
    point,
    angleDeg: clamp(easedAngle, options.minAngleDeg, options.maxAngleDeg),
  };
}

export function projectCrashMountain(
  multiplierBps: number,
  options?: Partial<CrashMountainOptions>,
): CrashMountainProjection {
  const normalizedOptions = normalizeOptions(options);
  const multiplier = normalizeMultiplier(
    multiplierBps,
    normalizedOptions.visualMaxMultiplier,
  );
  const worldPathPoints = buildPathPoints(normalizedOptions);
  const progress = progressForMultiplier(multiplier, normalizedOptions.visualMaxMultiplier);
  const lineProgress = lineProgressFor(progress);
  const worldLinePoint = projectProgress(lineProgress, normalizedOptions);
  const cameraLeftPercent = cameraLeftFor(worldLinePoint);
  const linePoint = applyCamera(worldLinePoint, cameraLeftPercent);
  const pathPoints = worldPathPoints.map((point) => applyCamera(point, cameraLeftPercent));
  const revealedPathPoints = buildRevealedPathPoints(linePoint, pathPoints);
  const goatProjection = goatProjectionFromPath(revealedPathPoints, progress, normalizedOptions);
  const zoomScale = zoomScaleFor(progress);

  return {
    ...linePoint,
    angleDeg: goatProjection.angleDeg,
    goatXPercent: goatProjection.point.xPercent,
    goatYPercent: goatProjection.point.yPercent,
    panXPercent: 0,
    pathPoints,
    revealedPathPoints,
    progressIndex: progressIndexFor(linePoint, pathPoints),
    progress,
    zoomScale,
  };
}

export function pointsToSvgPath(points: CurvePoint[]): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      const x = point.xPercent.toFixed(2);
      const y = (100 - point.yPercent).toFixed(2);
      return `${command} ${x} ${y}`;
    })
    .join(" ");
}

export function pointsToMountainTrailPath(points: CurvePoint[]): string {
  const visiblePoints = clipPointsToVisibleFrame(points);

  if (visiblePoints.length === 0) {
    return "";
  }

  const first = visiblePoints[0];
  const groundStartX = 0;
  const ridgeTail = visiblePoints
    .slice(1)
    .map((point) => `L ${point.xPercent.toFixed(2)} ${(100 - point.yPercent).toFixed(2)}`);
  return [
    `M ${groundStartX.toFixed(2)} ${(100 - first.yPercent).toFixed(2)}`,
    `L ${first.xPercent.toFixed(2)} ${(100 - first.yPercent).toFixed(2)}`,
    ...ridgeTail,
  ].filter(Boolean).join(" ");
}

export function pointsToMountainAreaPath(points: CurvePoint[]): string {
  const visiblePoints = clipPointsToVisibleFrame(points);

  if (visiblePoints.length === 0) {
    return "";
  }

  const first = visiblePoints[0];
  const last = visiblePoints[visiblePoints.length - 1];
  const groundStartX = 0;
  const ridgeTail = visiblePoints
    .slice(1)
    .map((point) => `L ${point.xPercent.toFixed(2)} ${(100 - point.yPercent).toFixed(2)}`);
  return [
    `M ${groundStartX.toFixed(2)} 100.00`,
    `L ${groundStartX.toFixed(2)} ${(100 - first.yPercent).toFixed(2)}`,
    `L ${first.xPercent.toFixed(2)} ${(100 - first.yPercent).toFixed(2)}`,
    ...ridgeTail,
    `L ${last.xPercent.toFixed(2)} 100.00`,
    "Z",
  ].join(" ");
}

function clipPointsToVisibleFrame(points: CurvePoint[]): CurvePoint[] {
  if (points.length === 0) {
    return [];
  }

  const visiblePoints: CurvePoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (point.xPercent >= 0) {
      if (visiblePoints.length === 0 && index > 0) {
        const previous = points[index - 1];
        const span = point.xPercent - previous.xPercent;

        if (span > 0 && previous.xPercent < 0) {
          const ratio = (0 - previous.xPercent) / span;
          visiblePoints.push({
            xPercent: 0,
            yPercent: previous.yPercent + (point.yPercent - previous.yPercent) * ratio,
          });
        }
      }

      visiblePoints.push(point);
    }
  }

  return visiblePoints;
}

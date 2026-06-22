import { describe, expect, it } from "vitest";
import {
  defaultCrashMountainOptions,
  pointsToMountainAreaPath,
  pointsToMountainTrailPath,
  pointsToSvgPath,
  projectCrashMountain,
} from "./crash-mountain";

describe("projectCrashMountain", () => {
  it("keeps the goat at the base while drawing the starting ridge ahead", () => {
    const projection = projectCrashMountain(10000);

    expect(projection.xPercent).toBeGreaterThan(defaultCrashMountainOptions.xStartPercent);
    expect(projection.yPercent).toBeGreaterThanOrEqual(
      defaultCrashMountainOptions.yStartPercent,
    );
    expect(projection.goatXPercent).toBe(defaultCrashMountainOptions.xStartPercent);
    expect(projection.goatYPercent).toBe(defaultCrashMountainOptions.yStartPercent);
    expect(projection.angleDeg).toBe(0);
    expect(projection.angleDeg).toBeLessThanOrEqual(
      defaultCrashMountainOptions.maxAngleDeg,
    );
  });

  it("moves monotonically forward and upward for representative multipliers", () => {
    const low = projectCrashMountain(10000);
    const medium = projectCrashMountain(15000);
    const high = projectCrashMountain(20000);
    const ceiling = projectCrashMountain(80000);

    expect(medium.xPercent).toBeGreaterThanOrEqual(low.xPercent);
    expect(high.xPercent).toBeGreaterThanOrEqual(medium.xPercent);
    expect(ceiling.xPercent).toBeGreaterThanOrEqual(high.xPercent);
    expect(medium.yPercent).toBeGreaterThanOrEqual(low.yPercent);
    expect(high.yPercent).toBeGreaterThanOrEqual(medium.yPercent);
    expect(ceiling.yPercent).toBeGreaterThanOrEqual(high.yPercent);
    expect(medium.goatXPercent).toBeGreaterThan(low.goatXPercent);
    expect(high.goatXPercent).toBeGreaterThan(medium.goatXPercent);
    expect(ceiling.goatXPercent).toBeGreaterThan(high.goatXPercent);
  });

  it("clamps values above the visual ceiling deterministically", () => {
    const ceiling = projectCrashMountain(80000);
    const beyond = projectCrashMountain(1000000);
    const repeated = projectCrashMountain(1000000);

    expect(beyond.xPercent).toBe(ceiling.xPercent);
    expect(beyond.yPercent).toBe(ceiling.yPercent);
    expect(beyond.angleDeg).toBe(ceiling.angleDeg);
    expect(repeated).toEqual(beyond);
  });

  it("clamps invalid and below-base inputs to safe base coordinates", () => {
    const base = projectCrashMountain(10000);
    const invalidInputs = [Number.NaN, Infinity, 0, -1000, 9999];

    for (const input of invalidInputs) {
      const projection = projectCrashMountain(input);
      expect(projection.xPercent).toBe(base.xPercent);
      expect(projection.yPercent).toBe(base.yPercent);
    }
  });

  it("generates bounded ordered path samples from the curve", () => {
    const projection = projectCrashMountain(18000);

    expect(projection.pathPoints).toHaveLength(defaultCrashMountainOptions.sampleCount);
    expect(projection.revealedPathPoints.length).toBeGreaterThan(1);
    expect(projection.revealedPathPoints.length).toBeLessThanOrEqual(
      projection.pathPoints.length + 1,
    );
    for (const point of projection.pathPoints) {
      expect(point.xPercent).toBeGreaterThanOrEqual(
        defaultCrashMountainOptions.xStartPercent,
      );
      expect(point.xPercent).toBeLessThanOrEqual(defaultCrashMountainOptions.xEndPercent);
      expect(point.yPercent).toBeGreaterThanOrEqual(
        defaultCrashMountainOptions.yStartPercent,
      );
      expect(point.yPercent).toBeLessThanOrEqual(defaultCrashMountainOptions.yEndPercent);
    }

    for (let index = 1; index < projection.pathPoints.length; index += 1) {
      expect(projection.pathPoints[index].xPercent).toBeGreaterThanOrEqual(
        projection.pathPoints[index - 1].xPercent,
      );
      expect(projection.pathPoints[index].yPercent).toBeGreaterThanOrEqual(
        projection.pathPoints[index - 1].yPercent,
      );
    }
  });

  it("reveals only the completed portion of the mountain curve", () => {
    const base = projectCrashMountain(10000);
    const medium = projectCrashMountain(15500);
    const ceiling = projectCrashMountain(80000);

    expect(base.revealedPathPoints.length).toBeLessThan(medium.revealedPathPoints.length);
    expect(medium.revealedPathPoints.length).toBeLessThan(
      ceiling.revealedPathPoints.length + 1,
    );
    expect(medium.revealedPathPoints[medium.revealedPathPoints.length - 1]).toMatchObject({
      xPercent: medium.xPercent,
      yPercent: medium.yPercent,
    });
  });

  it("keeps the goat on the ridge behind the actively revealed tip after launch", () => {
    const projection = projectCrashMountain(18000);

    expect(projection.goatXPercent).toBeLessThan(projection.xPercent);
    expect(projection.goatYPercent).toBeLessThan(projection.yPercent);
  });

  it("keeps the goat behind the extended line during the flat start", () => {
    const projection = projectCrashMountain(10400);

    expect(projection.goatXPercent).toBeLessThan(projection.xPercent);
    expect(projection.goatYPercent).toBeLessThanOrEqual(projection.yPercent);
  });

  it("keeps the actively revealed ridge near the right side of the camera window", () => {
    const base = projectCrashMountain(10000);
    const medium = projectCrashMountain(15500);
    const high = projectCrashMountain(60000);
    const ceiling = projectCrashMountain(80000);

    expect(base.xPercent).toBeLessThanOrEqual(90);
    expect(medium.xPercent).toBeLessThanOrEqual(90);
    expect(ceiling.xPercent).toBeLessThanOrEqual(90);
    expect(ceiling.xPercent).toBe(90);
    expect(high.goatXPercent).toBeLessThan(high.xPercent);
  });

  it("keeps angle output within the configured clamp", () => {
    for (const multiplierBps of [10000, 15000, 20000, 30000, 1000000]) {
      const projection = projectCrashMountain(multiplierBps);
      expect(projection.angleDeg).toBeGreaterThanOrEqual(
        defaultCrashMountainOptions.minAngleDeg,
      );
      expect(projection.angleDeg).toBeLessThanOrEqual(
        defaultCrashMountainOptions.maxAngleDeg,
      );
    }
  });

  it("eases goat rotation in after the flat starting ground", () => {
    const base = projectCrashMountain(10000);
    const climbing = projectCrashMountain(14000);

    expect(base.angleDeg).toBe(0);
    expect(climbing.angleDeg).toBeGreaterThan(base.angleDeg);
  });
});

describe("pointsToSvgPath", () => {
  it("formats curve points for a 100 by 100 SVG viewBox", () => {
    expect(
      pointsToSvgPath([
        { xPercent: 10, yPercent: 20 },
        { xPercent: 30.123, yPercent: 40.987 },
      ]),
    ).toBe("M 10.00 80.00 L 30.12 59.01");
  });
});

describe("pointsToMountainTrailPath", () => {
  it("extends the solid ridge line behind the first curve point", () => {
    expect(
      pointsToMountainTrailPath([
        { xPercent: 40, yPercent: 20 },
        { xPercent: 50, yPercent: 30 },
      ]),
    ).toBe("M 0.00 80.00 L 40.00 80.00 L 50.00 70.00");
  });

  it("clips offscreen ridge points to the left edge of the scene", () => {
    expect(
      pointsToMountainTrailPath([
        { xPercent: -10, yPercent: 20 },
        { xPercent: 10, yPercent: 40 },
      ]),
    ).toBe("M 0.00 70.00 L 0.00 70.00 L 10.00 60.00");
  });
});

describe("pointsToMountainAreaPath", () => {
  it("creates a closed area under the revealed ridge", () => {
    expect(
      pointsToMountainAreaPath([
        { xPercent: 40, yPercent: 20 },
        { xPercent: 50, yPercent: 40 },
      ]),
    ).toBe("M 0.00 100.00 L 0.00 80.00 L 40.00 80.00 L 50.00 60.00 L 50.00 100.00 Z");
  });

  it("returns an empty path for empty input", () => {
    expect(pointsToMountainAreaPath([])).toBe("");
  });
});

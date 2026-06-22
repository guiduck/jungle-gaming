# Implementation Plan: Procedural Crash Mountain and Goat Angle

**Spec**: `specs/005-procedural-crash-mountain-goat-angle/spec.md`  
**Branch**: `005-procedural-crash-mountain-goat-angle`  
**Date**: 2026-06-21  
**Status**: Planned for `/speckit-tasks`

## Summary

Replace the current linear goat movement in `frontend/src/components/GameScene.tsx` with a
frontend-only procedural crash mountain projection. The server-projected
`displayedMultiplierBps` remains the only authoritative input; the frontend maps that multiplier to
curve coordinates, a sampled SVG/CSS path, and a goat tangent angle for visual polish only.

The plan preserves the completed foundation:

- Game remains server-authoritative for round phase, multiplier ticks, crash point, manual
  cashout, auto-cashout, history, and verification.
- Wallet remains authoritative for balances and idempotent payout credits.
- Public REST, WebSocket, RabbitMQ, Keycloak, persistence, Docker Compose, and demo commands remain
  unchanged.
- The goat idle/run/jump sprite states remain intact.
- The multiplier text remains the primary readable game-state cue.

## Technical Context

- Frontend: Vite React in `frontend/src`.
- Hot game state: Zustand store in `frontend/src/stores/game-store.ts` exposes `phase` and
  `displayedMultiplierBps`.
- Scene component: `frontend/src/components/GameScene.tsx` currently derives a single `progress`
  percentage and applies it to both `left` and `bottom`.
- Styling: `frontend/src/styles.css` owns `.game-scene`, `.scene-header`, `.mountain`, `.path`,
  `.goat`, and sprite animation CSS.
- Tests: frontend uses Vitest through `npm.cmd --workspace frontend run test`.
- Visual assets: goat `idle.png`, `run.png`, and `jump.png` live under
  `frontend/public/assets/goat/`.

## Architecture Goals

- Keep the visual curve as a pure frontend projection of server state.
- Keep curve math deterministic, unit-testable, and independent from DOM reads.
- Render the mountain/path from the same curve samples that position the goat.
- Use SVG/CSS first; avoid canvas, WebGL, and new runtime dependencies.
- Preserve responsive layout and avoid overlapping multiplier text, wallet, controls, bets,
  history, and verification panels.
- Keep implementation additive and localized to frontend scene math/rendering plus docs/tests.

## Implementation Strategy

### 1. Pure Visual Projection Helper

Create a small helper near the scene code, for example
`frontend/src/services/crash-mountain.ts` or `frontend/src/components/crash-mountain.ts`.

The helper should expose typed functions such as:

```ts
export interface CrashMountainProjection {
  xPercent: number;
  yPercent: number;
  angleDeg: number;
  pathPoints: Array<{ xPercent: number; yPercent: number }>;
  progressIndex: number;
}

export function projectCrashMountain(
  multiplierBps: number,
  options?: Partial<CrashMountainOptions>,
): CrashMountainProjection
```

The default visual model should follow the clarified spec:

- Normalize multiplier from integer basis points: `max(1, multiplierBps / 10000)`.
- Start `visualMaxMultiplier` at `3.00x`.
- Use logarithmic `x` progress: `ln(multiplier) / ln(visualMaxMultiplier)`.
- Use multiplier-proportional `y` height: `(multiplier - 1) / (visualMaxMultiplier - 1)`.
- Clamp invalid, missing, low, and high values to safe scene bounds.
- Compute angle from the same curve, analytically or by neighboring samples.
- Clamp angle to a readable visual range such as `-8deg` through `42deg`.

Keep visual constants in frontend code near the helper:

- visual multiplier ceiling
- scene `xStart`, `xEnd`, `yStart`, `yEnd`
- path sample count
- tangent/angle clamp
- optional frame ratio used for angle calculation

Do not expose these constants through backend APIs or persisted settings.

### 2. Path Sampling and SVG Data

Generate `pathPoints` from the same helper rather than hand-authoring the path in markup/CSS.
Implementation can convert points to an SVG `d` path string in a small pure function:

```ts
export function pointsToSvgPath(points: CurvePoint[]): string
```

The full route can be rendered as a subtle base path. The progressed route should use the same
samples and reveal from the right side of the mountain scene toward the goat position, satisfying
ADR-008's right-to-left trail direction.

The preferred rendering approach:

- SVG inside `.mountain` or immediately layered within `.game-scene`.
- `viewBox="0 0 100 100"` so percentage coordinates map cleanly.
- `preserveAspectRatio="none"` or equivalent only if visual testing shows it is acceptable.
- `aria-hidden="true"` for decorative path shapes; multiplier text stays the accessible state.

### 3. GameScene Integration

Update `GameScene` to:

- Read `displayedMultiplierBps` and `phase` as it does today.
- Call the projection helper once per render.
- Preserve animation selection: `idle` during betting/settled, `run` during running, `jump` during
  crashed.
- Position the goat with `left: projection.xPercent`, `bottom: projection.yPercent`, and rotate by
  `projection.angleDeg`.
- Keep crash/jump styling related to the last projected point; any crash accent must not override
  the projection so strongly that the goat appears disconnected from the curve.
- Keep multiplier text in `.scene-header` prominent and not under decorative path layers.

Prefer CSS custom properties for style handoff:

```tsx
style={{
  "--goat-x": `${projection.xPercent}%`,
  "--goat-y": `${projection.yPercent}%`,
  "--goat-angle": `${projection.angleDeg}deg`,
} as React.CSSProperties}
```

This keeps component markup readable and avoids scattering transform strings through React.

### 4. Responsive Styling

Update `frontend/src/styles.css` in the existing scene classes rather than redesigning the page.

The scene should:

- Preserve `.game-scene` as the main visual region.
- Keep `.scene-header` above the mountain/path/goat layers with readable contrast.
- Keep `.mountain` bounds large enough for the goat to remain inside on desktop and mobile.
- Give fixed/responsive dimensions to the goat sprite so rotation cannot resize the layout.
- Avoid clipping the goat at the summit and base.
- Keep mobile `390x844` and desktop `1440x900` layouts legible.

The implementation should not add nested cards or broad landing-page treatment. This is a game
surface polish, not a layout redesign.

### 5. Frontend Tests

Add focused Vitest coverage for the pure helper. Suggested test file:

- `frontend/src/services/crash-mountain.test.ts`

Tests should cover:

- `1.00x` maps to the base point and a shallow/near-level angle.
- `1.50x`, `2.00x`, and `3.00x` move monotonically forward/upward.
- values above the visual ceiling clamp position while remaining deterministic.
- invalid inputs such as `NaN`, `Infinity`, `0`, negative numbers, and below-`10000` bps clamp to
  safe base coordinates.
- generated path samples are ordered, bounded, and non-empty.
- angle output remains within the configured clamp.

Component tests are optional unless implementation extracts renderable subcomponents with useful
behavior. The highest-value test is the pure curve helper.

### 6. Contracts and Backend Compatibility

No backend contract changes are planned.

The frontend input contract is the existing hot projection:

- `phase`
- `displayedMultiplierBps`
- current round snapshots/WebSocket events already reconciled through the store

Do not change:

- REST routes or DTOs
- WebSocket event names or payloads
- RabbitMQ events
- Game/Wallet domain behavior
- MikroORM schemas or migrations
- Docker Compose services/env
- `npm run demo:up`
- `npm run smoke:api`

### 7. Validation

Required validation before implementation closeout:

- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- Manual or automated desktop visual check at `1440x900`.
- Manual or automated mobile visual check at `390x844`.
- Confirm the multiplier text, wallet, controls, current bets, history, and verification sections do
  not overlap the goat/path incoherently.
- `npm.cmd run smoke:api` to prove existing evaluator smoke remains compatible.

Recommended validation when Docker/browser tooling is available:

- `npm.cmd run demo:up`
- Open `http://localhost:3000` with Keycloak login or dev mode as appropriate.
- Capture screenshots under `output/playwright/` or another ignored output folder if Playwright is
  used.
- Verify the goat starts near the mountain base, climbs along a curve, rotates with the tangent,
  and remains clamped at high multipliers while the numeric multiplier continues to update.

If Docker Desktop, Keycloak, or browser tooling blocks validation, closeout must state the exact
failed command, observed failure, and remaining manual verification step.

### 8. Documentation Closeout

Implementation must update affected docs plus:

- `docs/reference-ui.md`: final curve/path behavior and any chosen visual constants worth noting.
- `docs/handoff.md`: implementation status, validation run, blocked checks, and residual risks.
- `docs/roadmap.md`: Phase 4 progress and remaining candidates.
- `docs/next-spec-prompt.md`: next recommended Spec Kit prompt after this visual polish.

Update `README.md` only if validation commands, demo behavior, or player-visible instructions
change. No ADR is planned unless implementation chooses a meaningful trade-off beyond this plan,
such as adding a rendering dependency or moving away from SVG/CSS.

## Data Model Plan

See `data-model.md` for frontend-only projection types and visual constants.

No backend data model, database migration, or persisted frontend setting is planned.

## Contract Plan

See `contracts.md` for frontend projection, render, validation, and compatibility contracts.

Public REST, WebSocket, RabbitMQ, auth, and persistence contracts remain unchanged.

## Risks and Mitigations

- **Visual projection could look like gameplay truth**: keep multiplier text prominent and document
  the curve as frontend-only projection.
- **Curve could look flat for common low crashes**: use `visualMaxMultiplier = 3.00x` initially and
  keep it easy to tune in frontend constants.
- **Goat rotation could look broken at steep values**: clamp angle and test representative points.
- **Path and goat could drift apart**: render both from the same sampled helper output.
- **Right-to-left reveal could conflict with coordinate intuition**: implement it as a visual trail
  reveal while keeping goat movement forward/upward and verify in screenshots.
- **Responsive layout could overlap dense controls**: keep scene changes contained and run
  desktop/mobile visual checks.
- **Scope could creep into gameplay math**: no backend, schema, API, runner, Wallet, or cashout
  changes in this slice.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review and existing scene inspection.
2. Pure projection helper and SVG path utility.
3. Unit tests for projection, bounds, monotonicity, samples, and angle clamps.
4. `GameScene` integration using existing Zustand state and sprite phases.
5. CSS/SVG responsive layering and right-to-left progressed trail reveal.
6. Frontend typecheck, test, and build validation.
7. Desktop/mobile browser or screenshot validation.
8. `npm run smoke:api` compatibility check.
9. Documentation closeout in reference UI, handoff, roadmap, and next-spec prompt.

Avoid tasks for backend crash math, runner tick semantics, Wallet behavior, RabbitMQ, auth,
persistence, ranking, Storybook, sound effects, WebGL/canvas, or broad redesign.

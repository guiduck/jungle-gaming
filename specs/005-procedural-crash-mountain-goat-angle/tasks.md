# Tasks: Procedural Crash Mountain and Goat Angle

**Input**: `specs/005-procedural-crash-mountain-goat-angle/plan.md`  
**Spec**: `specs/005-procedural-crash-mountain-goat-angle/spec.md`  
**Status**: Planned for `/speckit-implement`

## Phase 0. Guardrails and Context

- [x] T001 Review `README.md`, `docs/`, `.specify/memory/constitution.md`, and all
  `specs/005-procedural-crash-mountain-goat-angle/*` artifacts before implementation.
- [x] T002 Confirm the implementation preserves existing public REST routes, WebSocket events,
  RabbitMQ contracts, Keycloak auth, MikroORM schemas, Docker Compose services, `npm run demo:up`,
  and `npm run smoke:api`.
- [x] T003 Inspect current frontend scene/state files before editing:
  `frontend/src/components/GameScene.tsx`, `frontend/src/styles.css`,
  `frontend/src/stores/game-store.ts`, `frontend/src/App.tsx`, and existing frontend tests.
- [x] T004 Confirm the feature remains frontend-only and does not modify backend crash math, round
  runner semantics, manual/auto cashout behavior, Wallet effects, public API contracts, auth,
  persistence, or demo scripts.
- [x] T005 Confirm no task introduces leaderboard, richer history, Storybook, sound effects,
  canvas/WebGL, a new runtime dependency, final asset production, or broad layout redesign.

## Phase 1. Projection Tests First

- [x] T006 Add `frontend/src/services/crash-mountain.test.ts` with a base-case test proving
  `1.00x` / `10000` bps maps to the lower/base projection and a clamped readable angle.
- [x] T007 Add projection tests proving `1.50x`, `2.00x`, and `3.00x` move monotonically
  forward/upward along the curve.
- [x] T008 Add projection tests proving values above the visual ceiling clamp position and angle
  while remaining deterministic.
- [x] T009 Add projection tests proving invalid inputs (`NaN`, `Infinity`, `0`, negative numbers,
  and below-`10000` bps) clamp to safe base coordinates.
- [x] T010 Add projection tests proving generated `pathPoints` are non-empty, ordered, bounded,
  and sampled from the same visual curve.
- [x] T011 Add projection tests proving `angleDeg` never leaves the configured clamp range.
- [x] T012 Add a pure utility test for SVG path formatting, if the implementation extracts
  `pointsToSvgPath(...)`.

## Phase 2. Pure Projection Helper

- [x] T013 Create `frontend/src/services/crash-mountain.ts` with explicit `CurvePoint`,
  `CrashMountainOptions`, and `CrashMountainProjection` types or equivalent local names.
- [x] T014 Add local visual constants for `visualMaxMultiplier = 3`, scene bounds, sample count,
  angle clamps, and frame ratio near the helper; do not load these from backend APIs or storage.
- [x] T015 Implement multiplier normalization from integer basis points, treating invalid,
  non-finite, below-base, and missing values as `1.00x`.
- [x] T016 Implement logarithmic `xPercent` projection and multiplier-proportional `yPercent`
  projection with bounded scene clamps.
- [x] T017 Implement tangent/angle calculation from the same curve, analytically or by neighboring
  samples, with readable angle clamps.
- [x] T018 Implement `pathPoints` sampling from `1.00x` through `visualMaxMultiplier` using the
  same projection model used for goat positioning.
- [x] T019 Implement `progressIndex` or equivalent progressed-sample metadata for the right-to-left
  trail reveal.
- [x] T020 Implement `pointsToSvgPath(...)` or equivalent small pure formatting utility if SVG path
  data is generated outside `GameScene`.
- [x] T021 Ensure the helper has no DOM access, React hooks, Zustand access, timers, random values,
  network calls, or browser-only APIs.

## Phase 3. GameScene Integration

- [x] T022 Update `frontend/src/components/GameScene.tsx` to import and call
  `projectCrashMountain(displayedMultiplierBps)` once per render.
- [x] T023 Replace the current linear `progress`-based `left`/`bottom` positioning with projection
  coordinates.
- [x] T024 Preserve existing sprite phase selection: idle for betting/settled, run for running,
  and jump for crashed.
- [x] T025 Apply goat rotation from `projection.angleDeg` through CSS custom properties or an
  equally readable style handoff.
- [x] T026 Render a decorative SVG/CSS full route from `projection.pathPoints` and keep it
  `aria-hidden="true"`.
- [x] T027 Render a progressed trail segment from the same samples with ADR-008's right-to-left
  reveal behavior.
- [x] T028 Keep multiplier text in `.scene-header` prominent, textual, and layered above decorative
  mountain/path/goat surfaces.
- [x] T029 Ensure crashed/jump styling remains visually related to the last projected curve point
  and does not disconnect the goat from the path.

## Phase 4. Responsive Styling and Accessibility

- [x] T030 Update `frontend/src/styles.css` scene styles to support SVG/path layers inside or near
  `.mountain` without obscuring multiplier text.
- [x] T031 Update `.goat` transform/transition rules to combine translate and tangent rotation
  without overriding crashed/jump positioning.
- [x] T032 Keep goat sprite dimensions stable so hover, animation, phase changes, and rotation do
  not resize or shift the scene layout.
- [x] T033 Adjust `.mountain` bounds and clipping so the goat remains visible at the base, along
  the path, and near the clamped summit.
- [x] T034 Verify mobile styles keep the scene legible at `390x844` without overlapping wallet,
  bet controls, current bets, history, verification, or multiplier text.
- [x] T035 Verify desktop styles keep the scene legible at `1440x900` without overlapping wallet,
  bet controls, current bets, history, verification, or multiplier text.
- [x] T036 Preserve the existing accessible scene label and ensure decorative SVG/path content is
  hidden from assistive technologies.

## Phase 5. Focused Validation

- [x] T037 Run `npx.cmd tsc -p frontend/tsconfig.json --noEmit`.
- [x] T038 Run `npm.cmd --workspace frontend run test`.
- [x] T039 Run `npm.cmd --workspace frontend run build`.
- [x] T040 Run `npm.cmd run smoke:api` to prove deterministic evaluator smoke remains compatible
  without visual-specific backend setup.
- [x] T041 Run or document a desktop visual check at `1440x900`, preferably with a screenshot saved
  under an ignored output folder when browser tooling is available.
- [x] T042 Run or document a mobile visual check at `390x844`, preferably with a screenshot saved
  under an ignored output folder when browser tooling is available.
- [x] T043 During visual checks, confirm the goat starts near the base, follows a curve, rotates
  with tangent slope, clamps near the summit for high multipliers, and keeps numeric multiplier text
  visible.
- [x] T044 If Docker Desktop, Keycloak, or browser tooling blocks validation, record the exact
  failed command, observed failure, and remaining manual verification step in closeout docs.

## Phase 6. Documentation Closeout

- [x] T045 Update `docs/reference-ui.md` with the implemented procedural curve/path behavior,
  right-to-left trail reveal, and any final visual constants worth documenting.
- [x] T046 Update `docs/handoff.md` with implementation status, validation results, blocked checks,
  residual risks, and the next recommended Spec Kit step.
- [x] T047 Update `docs/roadmap.md` with Phase 4 procedural mountain/goat-angle progress and
  remaining bonus candidates.
- [x] T048 Update `docs/next-spec-prompt.md` with the next useful Spec Kit prompt after this visual
  polish.
- [x] T049 Update `README.md` only if validation commands, demo behavior, or player-visible local
  instructions changed.
- [x] T050 Update `docs/architecture-decisions.md` only if implementation chooses a meaningful
  trade-off beyond the plan, such as adding a rendering dependency or moving away from SVG/CSS.
- [x] T051 Confirm final implementation report states validation run, validation blocked, desktop
  and mobile visual review status, smoke compatibility, and residual follow-up work.

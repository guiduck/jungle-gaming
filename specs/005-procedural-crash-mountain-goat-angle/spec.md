# Feature Specification: Procedural Crash Mountain and Goat Angle

**Feature Branch**: `005-procedural-crash-mountain-goat-angle`  
**Created**: 2026-06-21  
**Status**: Planned  
**Input**: User request to prioritize the deferred goat/mountain crash-curve visual before ranking

## Summary

Implement the previously deferred goat/mountain visual differentiator: the crash multiplier should
drive a procedural mountain curve, and the goat sprite should climb along that curve while rotating
to match the local slope.

This is a frontend polish slice that makes the product identity match the documented vision. The
server remains authoritative for round phase, multiplier ticks, crash point, cashout, auto-cashout,
wallet balance, history, and provably fair verification. The visual curve is a projection of the
server-supplied `displayedMultiplierBps`; it must not become gameplay truth.

## Existing Artifact Alignment

No blocking conflict was found with the completed specs or current docs:

- `README.md` and `docs/overview.md` state that the goat climbing a mountain is the visual identity
  of the game.
- `docs/vision.md` frames the goat/mountain animation as the frontend identity rather than a
  generic graph demo.
- `docs/reference-ui.md` says the next production polish pass should map `displayedMultiplierBps`
  to a crash-style curve point and rotate the goat to the local tangent while keeping the numeric
  multiplier prominent.
- `docs/architecture-decisions.md` ADR-008 explicitly deferred a curve-based mountain and goat
  tangent rotation until after persistence, auth, e2e confidence, operational polish, and
  server-authoritative auto-cashout.
- `docs/handoff.md` and `docs/roadmap.md` identify this feature as the selected next Phase 4 slice
  and preserve the same frontend-only projection constraint.
- `specs/001-gameplay-foundation/` allowed placeholder goat/mountain visuals for the MVP.
- `specs/002-persistence-auth-e2e-hardening/`, `specs/003-challenge-polish-operational-confidence/`,
  and `specs/004-server-authoritative-auto-cashout/` completed the server-authoritative foundation
  this visual slice depends on.

This spec intentionally supersedes the previously suggested leaderboard/richer-history prompt as
the next Phase 4 slice because it closes a documented product-identity gap.

## Clarifications

Clarification pass completed on 2026-06-21. The following answers are encoded so planning can
proceed without reopening visual-scope questions:

- This slice is visual/projection only. It does not change crash-point generation, server runner
  math, multiplier basis-point representation, cashout boundaries, auto-cashout evaluation, payout
  math, Wallet APIs, RabbitMQ idempotency, Keycloak auth, persistence schemas, or demo commands.
- The current backend runner may continue to publish integer multiplier ticks in basis points. The
  frontend must derive the mountain position from those ticks.
- The visual curve should resemble the classic crash-game graph: slow early climb, increasingly
  steep rise, and a clear crash interruption.
- The visual must use a deterministic pure helper so its math is unit-testable without rendering.
- The goat angle must come from the tangent/slope of the same curve used for the goat position.
- The multiplier text remains the primary accessible representation of the game state.
- The procedural trail must communicate forward motion in the existing mountain scene and satisfy
  ADR-008's direction that the path reveals as the goat advances, with a right-to-left reveal
  treatment.
- SVG/CSS is the intended first implementation approach. Canvas/WebGL remains out of scope unless
  planning discovers a concrete limitation that prevents a responsive, inspectable SVG/CSS path.
- The existing goat sprite assets under `frontend/public/assets/goat/` remain replaceable and must
  not be distorted beyond rotation/positioning needed for the climb.
- `visualMaxMultiplier`, curve bounds, sample count, and angle clamps are frontend visual constants,
  not server configuration and not persisted user settings.

## Visual Curve Model

The implementation should introduce a pure visual projection helper with this conceptual contract:

```ts
projectCrashMountain(multiplierBps: number, options?: VisualCurveOptions): {
  xPercent: number;
  yPercent: number;
  angleDeg: number;
  pathPoints: Array<{ xPercent: number; yPercent: number }>;
}
```

The helper should map the server multiplier to a bounded visual domain:

- `multiplier = max(1, multiplierBps / 10000)`
- `visualMaxMultiplier` defaults to a value that keeps common local-demo crashes visually readable,
  such as `3.00x`, while clamping higher values near the mountain summit.
- `t = clamp(ln(multiplier) / ln(visualMaxMultiplier), 0, 1)`
- `xPercent = xStart + (xEnd - xStart) * t`
- `yPercent = yStart + (yEnd - yStart) * ((multiplier - 1) / (visualMaxMultiplier - 1))`, clamped
  to `[yStart, yEnd]`

This keeps `x` proportional to elapsed crash-curve time for an exponential multiplier model while
keeping `y` proportional to the displayed multiplier height. The resulting path reads as a classic
crash curve inside the mountain frame.

The tangent angle should be computed from the same curve, either analytically or via neighboring
sampled points. If computed analytically, use the derivative of normalized `y` with respect to
normalized `x`:

```text
dy/dx = multiplier * ln(visualMaxMultiplier) / (visualMaxMultiplier - 1)
angleDeg = atan2(frameHeight * dy/dx, frameWidth) in degrees
```

Clamp the final goat angle to a readable range, such as `-8deg` through `42deg`, so the sprite
feels angled on the mountain without becoming visually broken.

The exact constants may be tuned during planning/implementation, but the mapping must remain
documented in code, deterministic, monotonic for the visible climb, and independent from backend
gameplay math.

Clarified visual defaults:

- `visualMaxMultiplier` should start at `3.00x` unless planning proves the current scene needs a
  different local-demo-friendly ceiling.
- The path should be sampled from the same projection helper, not hand-authored independently in
  component markup or CSS.
- The visible trail may include the full route and an emphasized progressed segment, but the
  progressed segment must reveal consistently from the right side of the mountain scene toward the
  goat position as required by ADR-008.
- If the goat reaches a clamped summit for multipliers above the visual ceiling, the multiplier
  text continues increasing from `displayedMultiplierBps`; only the visual position/angle clamps.

## User Stories and Acceptance Criteria

### User Story 1: Multiplier Drives a Real Mountain Climb

As a player, I want the goat to move along a mountain-shaped crash curve as the multiplier rises so
the game feels like a purpose-built Jungle Crash experience instead of a generic counter.

Acceptance criteria:

- Given the round is betting, the goat starts near the lower-left/base of the mountain and uses the
  idle sprite state.
- Given the round is running and the server publishes multiplier ticks, the goat position is derived
  from `displayedMultiplierBps` using the visual curve helper.
- Given the multiplier rises from `1.00x` toward the visual ceiling, the goat moves monotonically
  forward/upward along the path.
- Given multiplier ticks arrive unevenly or reconnect updates jump the displayed multiplier, the
  goat snaps or eases to the server-derived curve point without inventing payout truth.

### User Story 2: Goat Angle Matches the Curve

As a player, I want the goat to lean with the mountain slope so the sprite feels grounded on the
climb.

Acceptance criteria:

- Given the goat is on a shallow part of the path, the rotation is near level.
- Given the goat reaches a steeper part of the path, the rotation increases according to the curve
  tangent.
- Given the round crashes, the crash/jump state may override or accent the final rotation, but it
  must still clearly relate to the last known curve position.
- Given the goat asset is replaced later, the positioning/rotation API remains reusable.

### User Story 3: Procedural Path Is Inspectable and Responsive

As an evaluator, I want to see a visible procedural mountain/path that matches the multiplier so the
visual polish is understandable during a local demo.

Acceptance criteria:

- Given desktop width, the procedural path is visible behind or under the goat and does not obscure
  the multiplier text.
- Given mobile width, the scene remains legible and the goat/path do not overlap controls, wallet
  status, or history in an incoherent way.
- Given the multiplier is low, medium, or high, the path and goat remain within the scene bounds.
- Given the scene is rendered without JavaScript animation timing assumptions, the current state can
  still be reconstructed from `displayedMultiplierBps` alone.

### User Story 4: Accessible Multiplier Remains the Source of Player Readability

As a player, I want the multiplier text and phase state to remain easy to read while the goat moves
so the visual polish never hides the actual game state.

Acceptance criteria:

- Given the scene is running, the multiplier remains visually prominent and is not covered by the
  goat, mountain path, wallet panel, bet controls, history, or status text.
- Given a screen reader user reaches the scene, the scene exposes a concise accessible label and the
  multiplier text remains available as text rather than only as decoration.
- Given reduced viewport width, text wraps or reflows without overlapping controls or being clipped
  inside fixed-size UI elements.
- Given the visual projection disagrees with player intuition, the numeric multiplier remains the
  authoritative visible cue for the current round projection.

### User Story 5: Visual-Only Compatibility Is Preserved

As an evaluator, I want this polish to avoid backend and contract changes so existing server
authority, cashout, auto-cashout, wallet, auth, persistence, and smoke validation remain stable.

Acceptance criteria:

- Given the implementation is complete, no public REST/WebSocket contract changes are required for
  the visual curve.
- Given manual or auto cashout is evaluated, the result is still determined by the Game Service and
  Wallet flows, not by the visual helper.
- Given `npm run smoke:api` runs, the deterministic evaluator smoke remains valid without needing
  visual-specific backend setup.

## Functional Requirements

- **FR-001**: The frontend must add a pure helper that maps integer `multiplierBps` to curve
  coordinates and goat rotation without requiring DOM access.
- **FR-002**: The helper must use deterministic math and clamp invalid, missing, or extreme inputs
  to safe scene coordinates.
- **FR-003**: The GameScene must render a procedural mountain/path derived from the same curve model
  used to position the goat.
- **FR-004**: The goat sprite must be positioned on the curve and rotated by the curve tangent while
  preserving existing idle/run/jump animation states.
- **FR-005**: The multiplier text must remain prominent, accessible, and sourced from
  `displayedMultiplierBps`.
- **FR-006**: The scene must remain responsive for desktop and mobile viewport sizes without text or
  controls overlapping the goat/path.
- **FR-007**: The feature must not modify backend crash math, round runner tick semantics,
  auto-cashout thresholds, payout calculation, Wallet effects, public API contracts, or database
  schemas.
- **FR-008**: The implementation must keep the normal local gameplay path `bun run docker:up` and
  deterministic evaluator path `npm run demo:up` / `npm run smoke:api` working.
- **FR-009**: The implementation must include validation notes for desktop and mobile visual checks,
  including whether screenshots or browser verification were used.
- **FR-010**: Implementation closeout must update affected documentation, including
  `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`.
- **FR-011**: The procedural trail must support ADR-008's right-to-left reveal direction while using
  the same curve samples as goat positioning.

## Data and State Requirements

- No new backend data model is required.
- No new persisted frontend setting is required.
- The only authoritative input is the existing hot game projection:
  - `phase`
  - `displayedMultiplierBps`
  - current round status from server snapshots/WebSocket events
- Any visual constants, such as `visualMaxMultiplier`, frame bounds, and angle clamp, should live in
  frontend code near the helper and be easy to tune.
- Visual constants must not be fetched from or written to backend APIs.

## Edge Cases

- `displayedMultiplierBps` is below `10000`, missing, null, or not finite.
- Multiplier jumps after reconnect or query refetch.
- Multiplier exceeds the visual ceiling.
- Round crashes immediately after start.
- Round is betting/settled and no running multiplier tick has arrived yet.
- Mobile scene height is constrained.
- Goat sprite dimensions differ if assets are replaced.

## Non-Goals

- No changes to server-authoritative crash-point generation.
- No changes to the backend runner's tick progression or `ROUND_MULTIPLIER_STEP_BPS`.
- No changes to cashout, auto-cashout, payout, Wallet, RabbitMQ, Keycloak, Kong, or PostgreSQL
  behavior.
- No new leaderboard, richer history, social identity, or Storybook scope in this slice.
- No full redesign of the app layout or casino theme.
- No reliance on canvas or WebGL unless later planning proves SVG/CSS is insufficient.
- No change to goat sprite asset production beyond preserving the current idle/run/jump states and
  applying curve-based position/rotation.
- No new runtime dependency solely for curve math or SVG path generation unless planning identifies
  a concrete maintainability or correctness benefit.

## Success Criteria

- A local player can run the app and see the goat climb a curved mountain path instead of a linear
  diagonal.
- The goat visibly rotates with the slope as the multiplier increases.
- Unit tests prove coordinate and angle outputs for representative multipliers such as `1.00x`,
  `1.50x`, `2.00x`, and values above the visual ceiling.
- Frontend build/typecheck pass.
- Existing backend tests and evaluator smoke remain unaffected because the slice is visual-only.
- Manual or automated screenshots at desktop and mobile widths show no incoherent overlap.

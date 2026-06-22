# Contracts: Procedural Crash Mountain and Goat Angle

## Public Contract Compatibility

This feature must preserve all existing public and integration contracts.

Unchanged contracts:

- `POST /games/bet`
- `POST /games/cashout`
- current round, history, player bets, wallet, and verification REST routes
- Socket.IO event names and payloads
- RabbitMQ wallet debit/payout request/result events
- Keycloak auth behavior
- PostgreSQL/MikroORM schemas and migrations
- Docker Compose service configuration
- `npm run demo:up`
- `npm run smoke:api`

No backend service should need to know that the frontend renders a procedural mountain curve.

## Frontend Projection Contract

The new internal frontend contract is a pure function that maps a server-derived multiplier to a
visual projection:

```ts
projectCrashMountain(multiplierBps: number, options?: Partial<CrashMountainOptions>): {
  xPercent: number;
  yPercent: number;
  angleDeg: number;
  pathPoints: Array<{ xPercent: number; yPercent: number }>;
  progressIndex: number;
}
```

Contract requirements:

- Accept integer multiplier basis points.
- Require no DOM access, browser APIs, timers, network calls, Zustand state, React hooks, or random
  values.
- Clamp unsafe inputs to bounded scene coordinates.
- Return deterministic output for the same inputs/options.
- Generate path samples from the same curve used for goat position.
- Keep angle output within configured clamps.

## Render Contract

`GameScene` should consume the projection as render data:

- `xPercent` and `yPercent` position the goat.
- `angleDeg` rotates the goat container or sprite.
- `pathPoints` render the base curve and progressed trail.
- `phase` still selects `idle`, `run`, or `jump` sprite classes.
- `displayedMultiplierBps` still formats the prominent multiplier text.

Decorative SVG/path layers should be hidden from assistive technologies with `aria-hidden="true"`.
The section label and multiplier text remain the accessible representation of the scene state.

## Right-To-Left Trail Contract

ADR-008 requires the trail to reveal from right to left. The implementation contract is:

- The full sampled path may be visible as a subtle route.
- A progressed segment must reveal consistently from the right side of the mountain scene toward
  the goat position.
- The progressed segment must use the same sampled path points as the goat projection.
- The reveal is visual only; it must not affect multiplier, cashout, crash, or payout semantics.

## Testing Contract

Projection tests should assert:

- safe base output for invalid/below-base inputs
- monotonic `xPercent` and `yPercent` for increasing valid multipliers
- clamped position for above-ceiling multipliers
- angle clamp behavior
- deterministic path samples within bounds
- representative outputs for `1.00x`, `1.50x`, `2.00x`, `3.00x`, and above ceiling

Frontend validation should assert or manually confirm:

- desktop `1440x900` scene has no incoherent overlap
- mobile `390x844` scene has no incoherent overlap
- multiplier text remains visible above decorative path layers
- goat idle/run/jump states still render from existing sprite assets

## Operational Contract

The visual polish must not require new operational steps.

Required commands remain:

```powershell
npm.cmd --workspace frontend run test
npm.cmd --workspace frontend run build
npx.cmd tsc -p frontend/tsconfig.json --noEmit
npm.cmd run smoke:api
```

When browser verification is available, implementation should also capture or inspect desktop and
mobile layouts. Any inability to run browser or Docker validation must be recorded in closeout with
the command and observed blocker.

## Documentation Contract

Implementation closeout must update:

- `docs/reference-ui.md`
- `docs/handoff.md`
- `docs/roadmap.md`
- `docs/next-spec-prompt.md`

`README.md` changes are required only if user-facing demo instructions or validation commands
change.

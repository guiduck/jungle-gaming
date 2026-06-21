# Feature Specification: Server-Authoritative Auto-Cashout

**Feature Branch**: `004-server-authoritative-auto-cashout`  
**Created**: 2026-06-21  
**Status**: Planned  
**Input**: `docs/next-spec-prompt.md` and user `/speckit-specify` request

## Summary

Add one optional product differentiator after the completed challenge polish and operational
confidence slice: server-authoritative auto-cashout.

Players may set an optional target multiplier when placing a bet. If the round reaches that
threshold before the crash and the player's bet is still pending, the Game Service cashes out the
bet automatically using the same authoritative cashout rules, integer payout math, RabbitMQ payout
flow, persisted bet state, and Wallet idempotency guarantees as manual cashout.

This feature improves replay value and evaluator delight without changing the core crash math,
money model, auth model, persistence baseline, public Wallet API boundary, or local demo/smoke
workflow.

## Existing Artifact Alignment

No conflicts were found between this feature direction and `README.md`, `docs/`, the constitution,
or completed specs:

- `specs/001-gameplay-foundation/` explicitly deferred auto-cashout until after the gameplay MVP.
- `specs/002-persistence-auth-e2e-hardening/` kept auto-cashout out of scope while durable
  PostgreSQL, RabbitMQ, Keycloak, restart reconciliation, and e2e coverage were completed.
- `specs/003-challenge-polish-operational-confidence/` kept auto-cashout as a future product
  differentiator while preserving deterministic evaluator smoke and operational documentation.
- `docs/domain-model.md` lists auto-cashout as an open question after eliminatory criteria; the
  handoff now states those criteria and the challenge polish slice are complete enough to consider
  one optional differentiator.

The smallest coherent next slice is auto-cashout because it is player-facing, demonstrates product
judgment, and extends the existing bet/cashout model without adding new money endpoints, new
infrastructure, or client-side payout truth.

## Clarifications

- Auto-cashout is optional per bet. A player who omits the threshold keeps the current manual-only
  behavior.
- The additive bet request field is `autoCashoutMultiplierBps`. It is optional and nullable; an
  absent or null value means auto-cashout is disabled for that bet. The frontend may present this
  as a toggle plus multiplier input, but the API contract is the stored basis-point value.
- The auto-cashout threshold is stored with the accepted bet in durable Game state. It is not a
  transient frontend preference.
- The threshold is expressed as multiplier basis points, where `10000` means `1.00x`.
- Valid auto-cashout targets are inclusive integers from `11000` bps (`1.10x`) through `1000000`
  bps (`100.00x`). This keeps the first implementation useful and bounded without changing crash
  generation. Wider ranges can be considered later if product feedback justifies them.
- Auto-cashout targets cannot be added, changed, or removed after a bet is accepted in this slice.
  Editing live bets would add a separate synchronization and fairness problem and is out of scope.
- Auto-cashout is evaluated by the Game Service during the running round. The frontend may display
  the configured target, but it must not decide whether an auto-cashout succeeded.
- Manual cashout and auto-cashout race against the same pending bet state. Whichever server-side
  cashout transition succeeds first owns the result; the other path must observe the bet is no
  longer pending and must not create a second payout.
- Payout calculation remains the existing integer-cent formula used by manual cashout. This feature
  may add an auto-cashout trigger, but it must not change payout math.
- If the crash point is below the auto-cashout threshold, the bet loses exactly as it would without
  auto-cashout.
- If the threshold is reached before the crash, the server records the cashout multiplier as the
  configured `autoCashoutMultiplierBps` target. This avoids UI tick sampling becoming payout truth.
- Crash wins at the boundary: auto-cashout succeeds only when
  `autoCashoutMultiplierBps < crashMultiplierBps`. If the target equals or exceeds the crash
  multiplier, the bet remains pending until crash and is marked lost.
- The round runner should evaluate auto-cashout before publishing the next visible multiplier tick
  whenever the authoritative running multiplier has crossed a target that is strictly below the
  crash point. Clients then receive server events/snapshots after the persisted transition.
- Auto-cashout payout credits still use the existing Wallet payout-credit RabbitMQ flow and
  idempotency keys. The Wallet Service remains unaware of whether a payout was triggered manually
  or automatically except for optional descriptive metadata.
- Payout idempotency must be stable per bet payout, not per trigger attempt. The idempotency key
  must not allow a manual and automatic cashout race to produce two different Wallet credits for
  the same bet.
- Bet projections and history should expose `cashoutTrigger` with values `manual` or `auto` when a
  bet is cashed out. Pending/lost bets may omit it or return null.
- The deterministic evaluator smoke remains `npm run smoke:api`; this feature may add assertions
  to it later, but must not weaken it or make browser automation required.

## User Stories and Acceptance Criteria

### Story 1: Player sets an auto-cashout target with a bet

As a player, I want to set an optional auto-cashout multiplier while placing my bet so I can lock in
a target payout without needing to click at exactly the right moment.

Acceptance criteria:

- Given the round is in betting phase, when the player submits a valid bet with a valid
  auto-cashout target, then the accepted bet stores that target in multiplier basis points.
- Given the player submits a bet without an auto-cashout target, then the accepted bet behaves like
  the existing manual-only bet.
- Given the player submits a null or absent `autoCashoutMultiplierBps`, then auto-cashout is
  disabled for that bet.
- Given the player submits an auto-cashout target below the minimum allowed target, then the bet is
  rejected before wallet debit and no accepted bet is created.
- Given the player submits an auto-cashout target above the maximum allowed target, then the bet is
  rejected before wallet debit and no accepted bet is created.
- Given the player has insufficient balance, duplicate bet, invalid amount, or invalid round phase,
  then the existing rejection behavior still applies and the auto-cashout target does not create a
  bet.

### Story 2: Server automatically cashes out at the target

As a player with a pending bet and an auto-cashout target, I want the server to cash me out when the
round reaches my target before crash so the result is fair and consistent across clients.

Acceptance criteria:

- Given a running round reaches a pending bet's auto-cashout threshold before the crash, then the
  Game Service records a cashout for that bet without requiring a client request.
- Given auto-cashout succeeds, then the bet status becomes `cashed_out`, the cashout multiplier and
  payout cents are persisted, `cashoutTrigger` is `auto`, and WebSocket/API projections show the
  bet as cashed out.
- Given an auto-cashout target equals the crash multiplier, then the bet loses because crash wins
  at the boundary.
- Given multiple connected clients observe the round, then they converge on the same auto-cashout
  result, multiplier, payout, and wallet/history refresh state.
- Given the Wallet payout-credit message is retried or redelivered, then the payout is credited at
  most once.
- Given the Game Service restarts after an auto-cashout was persisted but before payout completion,
  then restart reconciliation preserves the cashout and replays or completes payout idempotently.

### Story 3: Manual cashout reconciles with auto-cashout

As a player, I want manual cashout and auto-cashout to reconcile cleanly so I never receive double
payouts or ambiguous results.

Acceptance criteria:

- Given the player manually cashes out before the auto-cashout threshold is reached, then manual
  cashout succeeds according to existing rules and auto-cashout does not later apply to that bet.
- Given auto-cashout has already cashed out the bet, when the player sends a manual cashout request,
  then the manual request returns the existing clear non-pending/already-cashed-out rejection or
  equivalent safe response without creating a second payout.
- Given a manual cashout request and auto-cashout trigger occur in the same round tick/window, then
  exactly one server-side cashout transition is persisted for the bet.
- Given duplicate cashout handling is inspected, then idempotency and persisted bet status prevent
  double Wallet payout credits.

### Story 4: Player sees auto-cashout state in the game UI

As a player, I want to see my configured auto-cashout target and final auto-cashout result so I can
understand what happened during the round.

Acceptance criteria:

- Given the betting phase is open, then the bet controls allow the player to enable or disable
  auto-cashout and enter a valid multiplier target.
- Given the player has already placed an accepted bet, then the UI does not offer live editing of
  the target for that bet in this slice.
- Given the player has a pending bet with auto-cashout enabled, then the UI displays the target in
  the player's current bet state.
- Given auto-cashout succeeds, then the UI distinguishes the result from a manual cashout in a
  concise way while still showing the authoritative multiplier and payout.
- Given auto-cashout is not configured, then the UI does not distract from the existing manual
  cashout flow.
- Given mobile and desktop widths, then the auto-cashout control and status fit the existing game
  screen without overlapping the goat/mountain scene, wallet status, bet controls, history, or
  verification areas.

### Story 5: History and verification remain trustworthy

As a player or evaluator, I want auto-cashout outcomes to appear in history without weakening
provably fair verification or Wallet correctness.

Acceptance criteria:

- Given a completed round contains auto-cashed-out bets, then round/player bet history includes the
  auto-cashout target where useful, the recorded cashout multiplier, payout cents, and cashout
  trigger type.
- Given a player verifies a completed round, then provably fair verification still recomputes the
  crash point from SHA-256/HMAC-SHA256 metadata and is independent from the player's auto-cashout
  target.
- Given a player loses because the crash point was below the auto-cashout threshold, then history
  clearly shows the bet as lost and does not imply the target was reached.

## Functional Requirements

- **FR-001**: `POST /games/bet` must accept an optional auto-cashout multiplier field in basis
  points named `autoCashoutMultiplierBps` as an additive, backward-compatible request property.
- **FR-002**: Bets accepted with auto-cashout enabled must persist the target multiplier with the
  bet in Game durable state.
- **FR-003**: Bets accepted without auto-cashout must preserve the existing manual-only behavior
  and response compatibility.
- **FR-004**: Auto-cashout target validation must happen before wallet debit is requested.
- **FR-005**: Auto-cashout targets must use integer multiplier basis points and must not use
  floating point arithmetic for validation, storage, comparison, or payout.
- **FR-006**: Auto-cashout target validation must accept only integer values from `11000` through
  `1000000` multiplier basis points, inclusive.
- **FR-007**: A player must still have at most one accepted bet per round.
- **FR-008**: Bet acceptance must still require Wallet debit confirmation before the bet is
  recorded as accepted.
- **FR-009**: The Game Service must evaluate auto-cashout only during the `running` phase and only
  for pending bets with stored auto-cashout targets.
- **FR-010**: Auto-cashout must transition a bet from `pending` to `cashed_out` through the same
  domain invariant path used by manual cashout or an equivalent shared domain behavior.
- **FR-011**: Manual cashout and auto-cashout must be mutually exclusive for a single bet; exactly
  one cashout transition and one payout request may be produced.
- **FR-012**: Auto-cashout payout cents must use the existing exact integer payout formula and
  existing multiplier basis-point representation.
- **FR-013**: Auto-cashout payout credits must use the existing RabbitMQ Wallet payout-credit flow
  with stable per-bet payout idempotency keys that cannot differ between manual and auto attempts
  for the same bet.
- **FR-014**: Wallet balances and operations must remain integer cents and duplicate-safe across
  RabbitMQ retries, service restarts, and reconciliation.
- **FR-015**: Public Wallet REST APIs must remain limited to player-safe create/read flows and must
  not expose arbitrary credit/debit endpoints.
- **FR-016**: Existing public route shapes must remain compatible:
  `GET /games/rounds/current`, `GET /games/rounds/history`,
  `GET /games/rounds/:roundId/verify`, `GET /games/bets/me`, `POST /games/bet`,
  `POST /games/bet/cashout`, `POST /wallets`, and `GET /wallets/me`.
- **FR-017**: Existing WebSocket projection behavior must remain server-to-client only; player
  commands must remain REST actions.
- **FR-018**: WebSocket/API projections must expose enough auto-cashout information for the current
  player to understand `autoCashoutMultiplierBps`, `cashoutTrigger`, cashout multiplier, and payout
  without exposing private Wallet internals.
- **FR-019**: Round history and player bet history must represent auto-cashout results as durable
  read models derived from Game/Wallet state, not from frontend-local state.
- **FR-020**: Provably fair verification semantics must remain unchanged: auto-cashout targets do
  not affect crash-point generation, commitment, reveal, or recomputation.
- **FR-021**: Backend auth must continue deriving player identity from Keycloak JWT `sub` in normal
  mode and from explicit dev identity only in dev mode.
- **FR-022**: `bun run docker:up` must remain the normal gameplay path with
  `DEMO_DETERMINISTIC_ROUNDS=false`.
- **FR-023**: `npm run demo:up` and `npm run smoke:api` must remain valid evaluator commands after
  this feature is implemented.
- **FR-024**: Game and Wallet domain code must remain free of NestJS, MikroORM, RabbitMQ,
  Socket.IO, controllers, DTOs, browser tooling, demo scripts, and logging-framework-specific
  concerns.
- **FR-025**: Implementation closeout must update affected docs plus `docs/handoff.md`,
  `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

## Key Entities and Data

- **Bet**: Gains optional persisted `autoCashoutMultiplierBps` and nullable `cashoutTrigger`
  projection data. Existing amount, status, cashout multiplier, and payout fields remain
  authoritative.
- **Round**: Continues to own lifecycle and bet transitions. During `running`, it is responsible
  for determining whether pending bets with auto-cashout targets should cash out before crash.
- **WalletOperation**: Existing payout-credit ledger remains the source of idempotent Wallet
  mutation. Auto-cashout may add descriptive metadata but must not require a new public money
  operation type unless planning proves it is necessary.
- **PlayerId**: Continues to identify the authenticated player from Keycloak or explicit dev mode.
- **CrashPoint**: Remains independent from auto-cashout targets and is still derived from
  provably fair metadata.

## Edge Cases

- Player submits an auto-cashout target exactly equal to the minimum or maximum allowed target.
- Player submits a target such as `1.00x`, below `1.00x`, an excessively high value, a malformed
  value, or a value that cannot be represented as integer basis points.
- Player tries to change or remove auto-cashout after the bet is accepted.
- Player manually cashes out just before the auto-cashout target is reached.
- Player manually cashes out at the same time the server evaluates the auto-cashout trigger.
- Auto-cashout target is reached on the same tick/window as the official crash point.
- Round crashes below the player's auto-cashout target.
- WebSocket disconnects before the auto-cashout event is observed; REST snapshots must reconcile
  the result.
- Game Service restarts after auto-cashout is recorded but before Wallet payout result is observed.
- RabbitMQ redelivers the payout-credit request or result for an auto-cashed-out bet.
- Existing players/bets created before this feature have no auto-cashout target.
- The deterministic API smoke runs while auto-cashout fields are absent from its bet request.

## Non-Goals

- Changing core bet/cashout payout math.
- Changing crash multiplier calculation, `houseEdgeBps = 100`, SHA-256 seed commitment, or
  HMAC-SHA256 verification semantics.
- Adding auto-bet or recurring betting.
- Adding live edit/cancel controls for auto-cashout after bet acceptance.
- Adding leaderboard, richer history beyond the fields needed to explain auto-cashout, sound
  effects, final artwork, or cosmetic-only redesign.
- Adding public arbitrary Wallet credit/debit APIs.
- Replacing PostgreSQL, MikroORM, RabbitMQ, Kong, Keycloak, Docker Compose, Vite React, TanStack
  Query, Zustand, or Socket.IO.
- Adding cloud deployment, monitoring infrastructure, dashboards, or log aggregation.
- Adding a broad browser automation suite or making browser PKCE automation required for this
  feature.
- Introducing multi-instance round-runner leader election or generalized saga/outbox
  infrastructure unless a later plan proves it is necessary for this specific feature.
- Letting the frontend decide auto-cashout success, payout, wallet balance, or crash outcome.

## Success Criteria

- A player can place a bet with an optional auto-cashout target and see that target reflected in
  current bet state.
- A pending bet with a valid target is automatically cashed out by the server when the running
  multiplier reaches the target before crash.
- Manual cashout and auto-cashout cannot both pay the same bet.
- Wallet payout credits remain idempotent and exact in integer cents.
- Existing manual-only betting and cashout flows continue to work unchanged when no target is set.
- History and player bet history explain auto-cashout outcomes without turning the frontend into a
  source of truth.
- Existing deterministic evaluator commands remain usable.
- Domain boundary and money arithmetic validation continue to pass.

## Assumptions

- The completed `003-challenge-polish-operational-confidence` implementation is the baseline.
- Existing persisted bets can be extended additively with nullable auto-cashout fields.
- The in-process Game runner remains the local Docker Compose runtime and can evaluate
  auto-cashout during multiplier progression.
- Existing RabbitMQ payout-credit idempotency is sufficient for auto-cashout payouts when stable
  idempotency keys include the bet identity and cashout result.
- Concrete target bounds and boundary ordering are clarified in this spec: `11000` through
  `1000000` bps inclusive, with crash winning when target is equal to or above crash.

# Implementation Plan: Read-Only Leaderboard and Richer History

**Spec**: `specs/006-read-only-leaderboard-history/spec.md`  
**Branch**: `006-read-only-leaderboard-history`  
**Date**: 2026-06-21  
**Status**: Planned for `/speckit-tasks`

## Summary

Add a bounded read-only Game Service projection for richer completed-round history, authenticated
player bet history, and a compact leaderboard of realized cashout wins. The implementation should
reuse authoritative `rounds` and `bets` data, keep Wallet behavior untouched, and integrate the
new information into the existing dense game screen panels.

The plan preserves the completed foundation:

- Game remains server-authoritative for round state, bet outcomes, crash multipliers, cashout
  triggers, history, and provably fair verification.
- Wallet remains authoritative for balances, debits, credits, and payout idempotency.
- Money stays integer cents and multipliers stay integer basis points.
- Player commands remain REST writes already in place; this slice adds no commands.
- WebSocket remains server-to-client invalidation/projection; no new socket event is planned.
- `bun run docker:up`, `npm run demo:up`, and `npm run smoke:api` remain valid.

## Technical Context

- Backend: NestJS Game Service in `services/games`.
- Current reads:
  - `GET /games/rounds/history` returns `CompletedRoundRecord[]` with verification fields.
  - `GET /games/rounds/:roundId/verify` returns one completed record.
  - `GET /games/bets/me` returns round snapshots containing the authenticated player's rounds.
- Application port: `RoundRepository` in `services/games/src/application/ports/game-ports.ts`.
- PostgreSQL adapter: `MikroOrmRoundRepository` can query `RoundEntity` and `BetEntity`.
- Memory adapter: `InMemoryRoundRepository` supports dev/test mode and should remain compatible.
- Frontend: Vite React, TanStack Query server reads in `frontend/src/hooks/use-game.ts`, hot
  animation state in Zustand, and compact panels in `frontend/src/App.tsx`.
- Current UI already has `History`, `My bets`, and `Verification` panels; this feature should enrich
  those panels and add a compact leaderboard panel or tab without broad layout redesign.

## Architecture Goals

- Keep read models in the Game application/infrastructure boundary, not in frontend-derived state.
- Avoid new domain invariants for ranking; this is a read projection over existing domain facts.
- Avoid new database tables by default. Add query helpers and, if needed, simple indexes only.
- Keep public route changes additive and backward compatible.
- Keep completed public gameplay reads privacy-safe; keep player-specific reads authenticated.
- Keep frontend rendering simple, bounded, and data-driven through TanStack Query.
- Preserve Docker Compose, Keycloak, RabbitMQ, Wallet, crash generation, cashout, settlement, and
  procedural mountain behavior.

## Implementation Strategy

### 1. Application Read Models and Limits

Extend `services/games/src/application/ports/game-ports.ts` with explicit read-model interfaces.
Suggested shapes:

```ts
export interface RoundHistorySummary {
  id: string;
  crashMultiplierBps: number;
  crashedAt: string;
  settledAt?: string;
  acceptedBetCount: number;
  cashedOutBetCount: number;
  lostBetCount: number;
  totalWageredCents: number;
  totalPayoutCents: number;
  verificationAvailable: boolean;
  notableBets: RoundNotableBet[];
}

export interface LeaderboardEntry {
  rank: number;
  playerDisplayId: string;
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: number;
  payoutCents: number;
  cashoutMultiplierBps: number;
  cashoutTrigger?: "manual" | "auto";
  autoCashoutMultiplierBps?: number;
  crashMultiplierBps: number;
  crashedAt: string;
}

export interface PlayerBetHistoryEntry {
  roundId: string;
  betId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  crashMultiplierBps: number;
  autoCashoutMultiplierBps?: number;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  cashoutTrigger?: "manual" | "auto";
  crashedAt?: string;
}
```

Use constants near the application service for limits:

- leaderboard default `10`, max `25`
- round/player history default `20`, max `50`
- repository scan window for leaderboard: start with recent completed rounds, capped to a bounded
  value such as `50` or `100` during implementation

Do not expose unbounded reads.

### 2. Repository Port Additions

Add read methods to `RoundRepository`:

```ts
getRoundHistorySummaries(limit: number): Promise<RoundHistorySummary[]>;
getLeaderboard(limit: number, metric: "payout" | "multiplier"): Promise<LeaderboardEntry[]>;
getPlayerBetHistory(playerId: string, limit: number): Promise<PlayerBetHistoryEntry[]>;
```

Keep existing methods for compatibility where current callers still need them:

- `getHistory(limit)`
- `getCompleted(roundId)`
- `getPlayerRoundSnapshots(playerId, limit)`

Planning preference:

- `getRoundHistory()` in `GameStateService` should switch to richer summaries for the UI route only
  if backward compatibility is preserved by additive fields.
- `getVerification(roundId)` should keep returning verification data, not the aggregate summary.
- `getPlayerBets()` may keep the existing route path while returning a richer, player-scoped read
  model if the frontend is updated in the same feature. If compatibility risk feels high during
  implementation, add a new read method behind the same route response with additive fields rather
  than removing round snapshot fields immediately.

### 3. PostgreSQL/MikroORM Queries

Implement the new repository reads in `MikroOrmRoundRepository` using `RoundEntity` and `BetEntity`.

Round history summary:

- Query completed rounds where `serverSeed` is not null.
- Populate or join bets for the bounded result set.
- Aggregate in TypeScript for simplicity unless a query-level aggregate is clearly cleaner.
- Use `crashedAt` descending.

Leaderboard:

- Query `BetEntity` rows with `status = "cashed_out"` whose `round.serverSeed` is not null.
- Populate `round`.
- For payout metric, sort by:
  1. `payoutCents` descending
  2. `cashoutMultiplierBps` descending
  3. `round.crashedAt` descending
  4. `bet.id` ascending
- For multiplier metric, sort by:
  1. `cashoutMultiplierBps` descending
  2. `payoutCents` descending
  3. `round.crashedAt` descending
  4. `bet.id` ascending
- Assign `rank` after sorting and limiting.

Player bet history:

- Query `BetEntity` by authenticated `playerId`.
- Populate `round`.
- Sort by bet or round recency descending.
- Return only the player's bet fields plus round outcome context.

Indexes:

- Existing `bets_round_player_idx` supports round/player lookups.
- Add a migration only if implementation proves leaderboard/player-history reads need indexes such
  as `bets(status, payout_cents)` or `bets(player_id, created_at)`.
- If a migration is added, keep it additive and repeatable through existing `games-migrations`.

### 4. In-Memory Repository Compatibility

Update `InMemoryRoundRepository` with equivalent bounded read-model behavior so unit/e2e tests and
explicit memory mode stay useful.

The in-memory implementation can derive summaries and leaderboard entries from:

- `completedRounds`
- `historicalSnapshots`
- current round snapshot when relevant for player history, while excluding active/incomplete rounds
  from leaderboard and completed history

Keep sorting and limit behavior identical to the MikroORM adapter.

### 5. GameStateService and Controller Routes

Add application methods:

```ts
getRoundHistorySummaries(limit?: number): Promise<RoundHistorySummary[]>;
getLeaderboard(input?: { metric?: "payout" | "multiplier"; limit?: number }): Promise<LeaderboardEntry[]>;
getPlayerBetHistory(playerIdValue: string, limit?: number): Promise<PlayerBetHistoryEntry[]>;
```

Clamp and validate limits in application/presentation code:

- Missing limit uses defaults.
- Non-integer or out-of-range limit returns a `400` through the existing controller style.
- Unknown metric returns `400`; default metric is `payout`.

Controller plan:

- Enrich `GET /games/rounds/history` to return `ItemsResponse<RoundHistorySummary>` with additive
  fields.
- Add `GET /games/leaderboard?metric=payout|multiplier&limit=10` if deriving leaderboard in the
  frontend from history would be insufficient. Given current history lacks bet detail and the spec
  needs privacy-safe ranked entries, this plan recommends adding the endpoint.
- Keep `GET /games/rounds/:roundId/verify` unchanged for provably fair details.
- Update `GET /games/bets/me` to return player-scoped richer bet history, or add additive fields to
  existing round snapshots while preserving the route path.

No Wallet controller changes are planned.

### 6. Swagger and Shared Types

Add DTO classes for:

- round history summary response
- notable bet summary
- leaderboard entry
- player bet history entry
- optional query DTO for leaderboard/read limits

The current `packages/contracts` package only carries RabbitMQ/socket contracts. Do not add these
REST read DTOs there unless implementation discovers shared package usage that benefits from it.

Frontend should update `frontend/src/types.ts` with local REST response types matching the API.

### 7. Frontend Data Fetching

Update `frontend/src/services/api.ts`:

- `getRoundHistory()` returns `ItemsResponse<RoundHistorySummary>`.
- Add `getLeaderboard(metric?: "payout" | "multiplier", limit?: number)` if the backend endpoint is
  added.
- `getMyBets()` returns `ItemsResponse<PlayerBetHistoryEntry>` if the route switches to the richer
  player history shape.

Update `frontend/src/hooks/use-game.ts`:

- Add a `leaderboardQuery` with query key such as `["leaderboard", "payout"]`.
- Reuse existing `history.updated`, `round.crashed`, and `round.settled` invalidation to refresh
  leaderboard and richer history.
- Keep independent TanStack Query reads parallel; avoid deriving leaderboard by looping through
  frontend history responses when the backend read model exists.

Avoid storing leaderboard/history in Zustand. Zustand remains for hot round projection and
animation.

### 8. Frontend UI Integration

Keep changes in the existing game screen:

- Replace the simple `History` rows with richer completed-round rows:
  - round id
  - crash multiplier
  - accepted/cashed/lost counts
  - total payout cents
  - crashed time
  - verification availability cue
- Add a compact `Leaderboard` panel near history/current bets, or use a compact tab/section if the
  panel area becomes crowded.
- Update `My bets` to show:
  - amount
  - status
  - crash multiplier
  - optional target
  - cashout multiplier
  - payout
  - manual/auto trigger

Display helpers should remain pure and small:

- `shortPlayerId(playerId: string): string`
- `formatCents`
- `formatMultiplierBps`
- `betOutcomeLabel`

React constraints from the local skill:

- Keep data fetching in TanStack Query; avoid ad hoc effects for server reads.
- Use primitive query keys.
- Avoid storing derived read-model data in component state.
- Extract repeated list-row rendering only if it improves clarity; do not introduce heavy
  component abstraction.

Responsive layout:

- Keep the goat/mountain scene first.
- On desktop, use dense panels in the existing grid.
- On mobile, stack panels below core controls and avoid text overflow via existing `overflow-wrap`
  patterns.

### 9. Tests

Backend unit/application tests:

- Round history summary aggregation:
  - no completed rounds
  - lost-only round
  - manual and auto cashouts
  - total wagered/payout cents
  - verification availability
- Leaderboard sorting:
  - payout metric tie-breakers
  - multiplier metric tie-breakers
  - lost/pending bets excluded
  - stable `rank`
- Limit clamping/validation.
- Player bet history returns only authenticated player's bets.

Repository tests:

- In-memory repository read models.
- MikroORM repository behavior if existing e2e/integration patterns support seeded entities.

Frontend tests:

- API path/query formatting for leaderboard.
- Pure display helpers for shortened player id, outcome labels, cents/multiplier formatting.
- Component tests are optional; add only if panel logic becomes complex enough to justify them.

Existing money/game tests should remain unchanged because this slice is read-only.

### 10. Smoke and Operations

`npm run smoke:api` must continue passing with existing behavior. It may be extended to assert:

- leaderboard endpoint returns `200` and an `items` array
- round history entries include aggregate fields after a completed smoke round
- player bet history includes the smoke player's latest result

Any new smoke assertions must be read-only and deterministic. Do not require browser automation or
extra seed data.

No new logs or infrastructure are required. Existing API telemetry is enough.

### 11. Documentation Closeout

Implementation must update affected docs plus:

- `README.md`: only if evaluator commands or visible feature walkthrough changes.
- `docs/reference-ui.md`: note richer history/leaderboard panel behavior.
- `docs/architecture.md`: note additive read-model endpoints if added.
- `docs/domain-model.md`: only if read models are documented alongside existing Game persistence.
- `docs/architecture-decisions.md`: add an ADR only if implementation chooses a meaningful trade-off
  beyond simple read projections, such as adding a materialized table.
- `docs/handoff.md`: implementation status, validation, blocked checks, and residual risks.
- `docs/roadmap.md`: Phase 4 progress and remaining candidates.
- `docs/next-spec-prompt.md`: next recommended Spec Kit prompt.

## Data Model Plan

See `data-model.md` for read-model details.

No new authoritative domain entity, Wallet data, or money state is planned. No database migration is
planned by default; add only query-supporting indexes if measured or test-driven implementation
needs them.

## Contract Plan

See `contracts.md` for REST response and query contracts.

Public RabbitMQ, Wallet, WebSocket, auth, and settlement contracts remain unchanged.

## Validation Plan

Required validation before implementation closeout:

- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `docker compose run --rm games bun test tests/unit`
- `docker compose run --rm games bun test tests/e2e`
- `docker compose run --rm wallets bun test tests/unit`
- `docker compose run --rm wallets bun test tests/e2e`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- `docker compose config --quiet`
- `npm.cmd run demo:up`
- `npm.cmd run smoke:api`
- Domain boundary search for forbidden framework/ORM/messaging/controller/DTO imports in Game/Wallet
  domain folders.
- Money arithmetic search confirming new read models do not introduce floating-point money math.

Recommended validation:

- Manual or automated desktop visual check at `1440x900`.
- Manual or automated mobile visual check at `390x844`.
- Confirm leaderboard/history panels do not overlap the goat/mountain scene, wallet, bet controls,
  current bets, or verification panel.

If Docker Desktop, Keycloak warmup, or browser tooling blocks validation, closeout must state the
exact command, observed failure, and remaining local verification step.

## Risks and Mitigations

- **Read model drifts into business rules**: keep ranking/aggregation in application/infrastructure
  read code and avoid changing domain transitions.
- **Leaderboard implies social/global product**: label it as recent local realized wins, show
  shortened ids only, and avoid profiles/chat/search.
- **Incomplete rounds pollute rankings**: filter on completed rounds with revealed verification
  data.
- **Unbounded queries slow local demo**: enforce defaults and max limits in API and repository
  methods.
- **Frontend becomes source of truth**: fetch precomputed read models through TanStack Query and do
  only display formatting in React.
- **Route compatibility breaks existing UI/smoke**: keep existing paths and response envelope
  shape; add fields instead of removing current fields unless frontend and smoke are updated in the
  same slice.
- **Scope grows into Wallet ledger/admin reporting**: keep Wallet untouched and exclude ledger/admin
  APIs explicitly.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review and current read API inspection.
2. Application read-model types, constants, and repository port additions.
3. In-memory repository read-model implementation and unit tests.
4. MikroORM repository read queries and tests.
5. GameStateService/controller/Swagger DTO updates, including optional leaderboard endpoint.
6. Frontend REST types and API/query hook updates.
7. History, leaderboard, and my-bets UI panel updates with responsive styling.
8. Backend/frontend tests and typechecks.
9. Demo/smoke compatibility validation, with optional read-only smoke assertions.
10. Documentation closeout in affected docs, handoff, roadmap, and next-spec prompt.

Avoid tasks for Wallet mutation, betting/cashout behavior changes, RabbitMQ changes, new WebSocket
events, chat/social/admin features, materialized analytics infrastructure, broad redesign, or
browser PKCE automation.

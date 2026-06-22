# Tasks: Read-Only Leaderboard and Richer History

**Input**: `specs/006-read-only-leaderboard-history/plan.md`  
**Spec**: `specs/006-read-only-leaderboard-history/spec.md`  
**Status**: Implemented and validated

## Phase 0. Guardrails and Context

- [x] T001 Review `README.md`, relevant `docs/`, `.specify/memory/constitution.md`, and all
  `specs/006-read-only-leaderboard-history/*` artifacts before implementation.
- [x] T002 Confirm the implementation preserves existing betting, cashout, auto-cashout, Wallet,
  RabbitMQ, Keycloak, Kong, crash generation, settlement, verification, WebSocket event, Docker
  Compose, `npm run demo:up`, and `npm run smoke:api` behavior.
- [x] T003 Inspect current backend read files before editing:
  `services/games/src/application/game-state.service.ts`,
  `services/games/src/application/ports/game-ports.ts`,
  `services/games/src/presentation/controllers/games.controller.ts`,
  `services/games/src/infrastructure/persistence/in-memory-round.repository.ts`,
  `services/games/src/infrastructure/persistence/mikro-orm/mikro-orm-round.repository.ts`,
  `services/games/src/infrastructure/persistence/mikro-orm/entities.ts`, and
  `services/games/src/infrastructure/persistence/mikro-orm/schema.ts`.
- [x] T004 Inspect current frontend read/UI files before editing:
  `frontend/src/types.ts`, `frontend/src/services/api.ts`, `frontend/src/hooks/use-game.ts`,
  `frontend/src/App.tsx`, `frontend/src/styles.css`, and existing frontend tests.
- [x] T005 Confirm no task introduces Wallet mutation, betting automation, new cashout commands,
  RabbitMQ changes, new WebSocket events, chat/social profiles, admin tooling, analytics
  infrastructure, broad redesign, or browser PKCE automation.

## Phase 1. Backend Read-Model Tests First

- [x] T006 Add Game repository/application tests proving round history summary returns an empty
  list when no completed rounds exist.
- [x] T007 Add tests proving round history summary aggregates a lost-only completed round:
  accepted bet count, lost count, total wagered cents, zero total payout cents, crash multiplier,
  and verification availability.
- [x] T008 Add tests proving round history summary aggregates manual and auto cashouts with
  cashed-out count, lost count, total wagered cents, total payout cents, and cashout trigger
  details.
- [x] T009 Add tests proving leaderboard excludes pending bets, lost bets, and bets from active or
  unrevealed rounds.
- [x] T010 Add tests proving `metric=payout` leaderboard sorting uses payout cents,
  cashout multiplier, crashed timestamp, and bet id tie-breakers.
- [x] T011 Add tests proving `metric=multiplier` leaderboard sorting uses cashout multiplier,
  payout cents, crashed timestamp, and bet id tie-breakers.
- [x] T012 Add tests proving leaderboard ranks are assigned after sorting and limiting.
- [x] T013 Add tests proving player bet history returns only the authenticated player's bets and
  includes round outcome context.
- [x] T014 Add tests proving invalid read query limits and unsupported leaderboard metrics produce
  safe `400` responses or equivalent controller-level rejection.

## Phase 2. Application Types and Limits

- [x] T015 Add read-model interfaces to `services/games/src/application/ports/game-ports.ts`:
  `RoundNotableBet`, `RoundHistorySummary`, `LeaderboardEntry`, `PlayerBetHistoryEntry`, and a
  leaderboard metric type.
- [x] T016 Add application constants for leaderboard default/max limits (`10`/`25`) and
  round/player history default/max limits (`20`/`50`).
- [x] T017 Add a small limit/metric validation helper in the Game application or presentation layer
  so query validation is consistent across history, leaderboard, and player bet reads.
- [x] T018 Add repository port methods for `getRoundHistorySummaries(...)`, `getLeaderboard(...)`,
  and `getPlayerBetHistory(...)` while keeping existing `getHistory(...)`, `getCompleted(...)`, and
  `getPlayerRoundSnapshots(...)` methods available for compatibility.
- [x] T019 Add a deterministic privacy-safe player display helper for read models, or document that
  the backend returns raw `playerId` while the frontend formats shortened display ids.

## Phase 3. In-Memory Repository Implementation

- [x] T020 Implement `getRoundHistorySummaries(...)` in
  `services/games/src/infrastructure/persistence/in-memory-round.repository.ts` from completed
  rounds and historical snapshots.
- [x] T021 Implement in-memory aggregate calculations for accepted bet count, cashed-out count,
  lost count, total wagered cents, total payout cents, verification availability, and notable bets.
- [x] T022 Implement `getLeaderboard(...)` in the in-memory repository with both payout and
  multiplier metrics, completed-round filtering, deterministic tie-breakers, ranks, and bounded
  limits.
- [x] T023 Implement `getPlayerBetHistory(...)` in the in-memory repository with player filtering,
  active/current bet compatibility where appropriate, and round outcome context.
- [x] T024 Ensure in-memory read-model implementations use integer cents and basis-point values
  directly without floating-point money arithmetic.

## Phase 4. MikroORM Repository Implementation

- [x] T025 Implement `getRoundHistorySummaries(...)` in
  `services/games/src/infrastructure/persistence/mikro-orm/mikro-orm-round.repository.ts` by
  querying completed rounds where `serverSeed` is not null and populating bounded bets.
- [x] T026 Implement PostgreSQL-backed aggregate calculations for accepted/cashed-out/lost counts,
  total wagered cents, total payout cents, verification availability, and notable bets.
- [x] T027 Implement `getLeaderboard(...)` using `BetEntity` plus completed parent `RoundEntity`
  data, excluding pending/lost and unrevealed-round data.
- [x] T028 Implement deterministic payout and multiplier leaderboard sorting with stable bet-id
  tie-breakers and rank assignment.
- [x] T029 Implement `getPlayerBetHistory(...)` using authenticated `playerId`, populated round
  context, bounded limit, and recency sorting.
- [x] T030 Add an additive Game migration for read-query indexes only if implementation or tests
  prove they are needed; otherwise explicitly leave schema unchanged.
- [x] T031 No migration was added; `games-migrations` remained repeatable and authoritative money
  and settlement state were not altered.

## Phase 5. Game Service API and Swagger

- [x] T032 Add `GameStateService.getRoundHistorySummaries(...)` with default/max limit handling and
  repository delegation.
- [x] T033 Add `GameStateService.getLeaderboard(...)` with default metric `payout`, metric
  validation, default/max limit handling, and repository delegation.
- [x] T034 Add `GameStateService.getPlayerBetHistory(...)` that derives `PlayerId` from the
  authenticated value and delegates to the repository.
- [x] T035 Update `GET /games/rounds/history` to return `{ items: RoundHistorySummary[] }` while
  preserving existing useful fields: `id`, `crashMultiplierBps`, and `crashedAt`.
- [x] T036 Add `GET /games/leaderboard?metric=payout|multiplier&limit=10` as a read-only Game
  endpoint returning `{ metric, items }`.
- [x] T037 Update `GET /games/bets/me` to return richer player bet history or additive equivalent
  fields while keeping the `{ items: [...] }` envelope and Keycloak/dev identity behavior.
- [x] T038 Keep `GET /games/rounds/:roundId/verify` unchanged for provably fair verification
  details and unrevealed seed safety.
- [x] T039 Updated Swagger query parameter documentation; response contracts are captured in
  `contracts.md` without adding response DTO decorators to avoid Bun direct-import fragility.
- [x] T040 Confirm no Wallet controller, Wallet DTO, public Wallet route, RabbitMQ event, or
  WebSocket event is changed by this feature.

## Phase 6. Frontend Data Types and Query Hooks

- [x] T041 Update `frontend/src/types.ts` with `RoundNotableBet`, `RoundHistorySummary`,
  `LeaderboardEntry`, `LeaderboardResponse`, and `PlayerBetHistoryEntry`.
- [x] T042 Update `frontend/src/services/api.ts` so `getRoundHistory()` returns
  `ItemsResponse<RoundHistorySummary>`.
- [x] T043 Add `getLeaderboard(metric?: "payout" | "multiplier", limit?: number)` to
  `frontend/src/services/api.ts` with correct query-string formatting.
- [x] T044 Update `getMyBets()` to return `ItemsResponse<PlayerBetHistoryEntry>` or a compatible
  typed shape matching the chosen backend response.
- [x] T045 Update `frontend/src/hooks/use-game.ts` with a `leaderboardQuery` using a primitive query
  key such as `["leaderboard", "payout"]`.
- [x] T046 Update socket/refetch invalidation so `history.updated`, `round.crashed`,
  `round.settled`, `bet.accepted`, and `cashout.accepted` refresh leaderboard, round history, and
  player bet history as needed.
- [x] T047 Confirm leaderboard/history/player bet read data stays in TanStack Query and is not
  duplicated into Zustand.

## Phase 7. Frontend Display Helpers and Tests

- [x] T048 Add frontend tests for `getLeaderboard(...)` path/query formatting, including default
  and explicit `metric`/`limit` cases.
- [x] T049 Add pure display helper tests for shortened player id formatting, including empty and
  short ids.
- [x] T050 Add pure display helper tests for bet outcome labels covering lost, manual cashout, auto
  cashout, pending auto target, and unavailable legacy fields.
- [x] T051 Add or update frontend tests proving cents/multiplier display helpers continue using
  cents and basis-point inputs without turning money values into floating-point state.
- [x] T052 Extract display helpers from `frontend/src/App.tsx` only if needed for focused tests and
  readability; keep helper scope small.

## Phase 8. Frontend UI Implementation

- [x] T053 Update the existing `History` panel to show richer completed-round facts: crash
  multiplier, accepted/cashed/lost counts, total payout cents, crashed time, and verification
  availability.
- [x] T054 Add a compact `Leaderboard` panel or compact tab/section near the existing history/current
  bets area showing rank, player display id, payout, cashout multiplier, trigger, and round
  reference.
- [x] T055 Update `My bets` to render `PlayerBetHistoryEntry` rows with amount, status, crash
  multiplier, optional auto target, cashout multiplier, payout, and manual/auto trigger.
- [x] T056 Preserve concise empty states for no completed rounds, no leaderboard wins, and no player
  bets.
- [x] T057 Ensure public leaderboard rows use privacy-safe shortened player display ids and do not
  expose profile, email, avatar, chat, or social data.
- [x] T058 Update `frontend/src/styles.css` for dense responsive list rows/panels without nesting
  cards or redesigning the page.
- [x] T059 Confirm mobile layout stacks leaderboard/history below core controls without overlapping
  the goat/mountain scene, wallet, bet controls, current bets, or verification panel.
- [x] T060 Confirm desktop layout keeps leaderboard/history readable in the existing grid without
  obscuring multiplier text or controls.

## Phase 9. Smoke and Validation

- [x] T061 Run `npx.cmd tsc -p services/games/tsconfig.json --noEmit`.
- [x] T062 Run `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`.
- [x] T063 Run `npx.cmd tsc -p frontend/tsconfig.json --noEmit`.
- [x] T064 Run `docker compose run --rm games bun test tests/unit`.
- [x] T065 Run `docker compose run --rm games bun test tests/e2e`.
- [x] T066 Run `docker compose run --rm wallets bun test tests/unit`.
- [x] T067 Run `docker compose run --rm wallets bun test tests/e2e`.
- [x] T068 Run `npm.cmd --workspace frontend run test`.
- [x] T069 Run `npm.cmd --workspace frontend run build`.
- [x] T070 Run `docker compose config --quiet`.
- [x] T071 Run `npm.cmd run demo:up` and confirm evaluator startup remains valid.
- [x] T072 Run `npm.cmd run smoke:api` and confirm deterministic smoke still validates health,
  auth, wallet, bet, cashout/crash, history/player-bet state, and verification.
- [x] T073 If practical, extend `npm run smoke:api` with read-only deterministic assertions for
  `GET /games/leaderboard`, enriched `GET /games/rounds/history`, and enriched
  `GET /games/bets/me`.
- [x] T074 Run a final domain boundary search for forbidden NestJS, MikroORM, RabbitMQ, Socket.IO,
  controller, DTO, browser, demo-script, or logging imports in Game/Wallet domain folders.
- [x] T075 Run a final money arithmetic search confirming new leaderboard/history aggregation keeps
  money as integer cents and multipliers as basis points.

## Phase 10. Manual UI Verification

- [x] T076 Run or document a desktop visual check at `1440x900`, preferably with a screenshot under
  an ignored output folder when browser tooling is available.
- [x] T077 Run or document a mobile visual check at `390x844`, preferably with a screenshot under
  an ignored output folder when browser tooling is available.
- [x] T078 During visual checks, confirm leaderboard/history panels do not overlap or obscure the
  goat/mountain scene, multiplier text, wallet, bet controls, current bets, my bets, or verification.
- [x] T079 During visual checks, confirm leaderboard labels make the ranking metric clear and do not
  imply in-progress rounds or lost bets are payout wins.
- [x] T080 Browser tooling initially required escalation for npm cache access; final desktop and
  mobile screenshots succeeded and are recorded under `output/playwright`.
  command, observed failure, and remaining manual verification step in closeout docs.

## Phase 11. Documentation Closeout

- [x] T081 Update `docs/reference-ui.md` with richer history, leaderboard, player bet history, empty
  states, and responsive placement behavior.
- [x] T082 Update `docs/architecture.md` with additive Game read-model endpoints if
  `GET /games/leaderboard` or richer history/player bet contracts are implemented.
- [x] T083 Update `docs/domain-model.md` only if implementation documents read models alongside
  existing Game persistence and bet outcome facts.
- [x] T084 Update `README.md` only if evaluator instructions, visible feature walkthrough, or
  validation commands change.
- [x] T085 No architecture decision update was needed because this implementation uses simple
  additive read projections with no materialized table or new indexing strategy.
- [x] T086 Update `docs/handoff.md` with implementation status, validation results, blocked checks,
  residual risks, and the next recommended Spec Kit step.
- [x] T087 Update `docs/roadmap.md` with Phase 4 leaderboard/richer-history progress and remaining
  bonus candidates.
- [x] T088 Update `docs/next-spec-prompt.md` with the next useful `/speckit-specify` prompt after
  this read-only leaderboard/history slice.
- [x] T089 Confirm final implementation report states validation run, validation blocked, desktop
  and mobile UI review status, smoke compatibility, read-only boundary preservation, and residual
  follow-up work.

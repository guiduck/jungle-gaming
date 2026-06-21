# Tasks: Server-Authoritative Auto-Cashout

**Input**: `specs/004-server-authoritative-auto-cashout/plan.md`  
**Spec**: `specs/004-server-authoritative-auto-cashout/spec.md`  
**Status**: Implemented; Docker daemon-dependent validation remains blocked until Docker Desktop is available.

## Phase 0. Guardrails and Context

- [x] T001 Review `README.md`, `docs/`, `.specify/memory/constitution.md`, and all
  `specs/004-server-authoritative-auto-cashout/*` artifacts before implementation.
- [x] T002 Confirm the implementation preserves existing public REST routes, Keycloak-first auth,
  RabbitMQ wallet-effect contracts, WebSocket server-to-client projection, integer cents,
  multiplier basis points, and SHA-256/HMAC-SHA256 verification semantics.
- [x] T003 Inspect current Game domain/application/persistence files before editing:
  `services/games/src/domain/entities/bet.ts`, `round.ts`,
  `services/games/src/application/game-state.service.ts`,
  `round-runner.service.ts`, and MikroORM bet mapping files.
- [x] T004 Inspect current frontend bet/cashout surfaces before editing:
  `frontend/src/App.tsx`, `frontend/src/services/api.ts`, `frontend/src/types.ts`,
  `frontend/src/hooks/use-game.ts`, and existing frontend tests.
- [x] T005 Confirm no task introduces live auto-cashout editing, auto-bet, leaderboard,
  browser PKCE automation, final artwork, monitoring infrastructure, or multi-instance runner
  coordination.

## Phase 1. Test Scaffolding First

- [x] T006 Add Game domain/unit tests for valid auto-cashout targets at `11000` and `1000000` bps.
- [x] T007 Add Game domain/unit tests for invalid auto-cashout targets: absent/null allowed,
  below `11000`, above `1000000`, non-integer, and malformed values rejected.
- [x] T008 Add Game domain/unit tests proving manual-only bets still behave exactly as before when
  `autoCashoutMultiplierBps` is absent or null.
- [x] T009 Add Game domain/unit tests proving auto-cashout below crash records
  `cashoutMultiplierBps`, `cashoutTrigger: "auto"`, and integer `payoutCents`.
- [x] T010 Add Game domain/unit tests proving target equal to crash loses because crash wins at the
  boundary.
- [x] T011 Add Game domain/unit tests proving manual cashout before the target prevents later
  auto-cashout and keeps `cashoutTrigger: "manual"`.
- [x] T012 Add Game domain/unit tests proving auto-cashout before manual cashout prevents a second
  cashout transition.
- [x] T013 Add Game application/e2e tests proving invalid `autoCashoutMultiplierBps` rejects before
  Wallet debit is requested.
- [x] T014 Add Game application/e2e tests proving accepted bets persist and rehydrate
  `autoCashoutMultiplierBps` and `cashoutTrigger`.
- [x] T015 Add Game application/e2e tests proving runner/application evaluation auto-cashes out
  before crash and publishes a compatible `cashout.accepted` projection.
- [x] T016 Add Game application/e2e tests proving restart reconciliation preserves an
  auto-cashed-out bet and replays payout through stable `payout-credit:{roundId}:{betId}`
  idempotency.
- [x] T017 Add frontend tests for bet payload formatting with auto-cashout enabled, disabled, and
  null/omitted.
- [x] T018 Add frontend tests for multiplier display-to-basis-point conversion and validation
  helpers.

## Phase 2. Domain Implementation

- [x] T019 Extend `BetSnapshot` with optional `autoCashoutMultiplierBps` and nullable
  `cashoutTrigger`.
- [x] T020 Add domain validation for auto-cashout targets: integer `11000` through `1000000` bps
  inclusive, with undefined/null treated as disabled.
- [x] T021 Update `Bet.create(...)` and `Bet.rehydrate(...)` to carry optional
  `autoCashoutMultiplierBps` without changing existing amount validation.
- [x] T022 Update `Bet.cashOut(...)` to record `cashoutTrigger`, defaulting manual cashout calls to
  `"manual"`.
- [x] T023 Add domain behavior for automatic cashout that records the configured target as
  `cashoutMultiplierBps`, sets `cashoutTrigger: "auto"`, and uses existing integer payout math.
- [x] T024 Update `Round.placeBet(...)` and `Round.assertCanPlaceBet(...)` to validate and store
  the optional auto-cashout target before Wallet debit.
- [x] T025 Add `Round` behavior for evaluating eligible auto-cashouts only while running, only for
  pending bets, only when target is reached, and only when target is strictly below crash.
- [x] T026 Ensure `Round.crash()` leaves target-equal-to-crash and target-above-crash bets as lost
  without applying auto-cashout.
- [x] T027 Confirm Game domain files still do not import NestJS, MikroORM, RabbitMQ, Socket.IO,
  controllers, DTOs, browser tooling, demo scripts, or logging helpers.

## Phase 3. Application and Runner Implementation

- [x] T028 Update `GameStateService.placeBet(...)` to accept
  `autoCashoutMultiplierBps?: number | null` and validate it before `requestBetDebit(...)`.
- [x] T029 Include `autoCashoutMultiplierBps` in accepted bet snapshots and `bet.accepted` event
  payloads when configured.
- [x] T030 Update manual `GameStateService.cashOut(...)` to preserve existing behavior while
  setting `cashoutTrigger: "manual"`.
- [x] T031 Add `GameStateService.evaluateAutoCashouts(currentMultiplierBps)` or equivalent
  application method that loads current round, applies eligible auto-cashouts, saves once, and
  publishes `cashout.accepted` with `cashoutTrigger: "auto"`.
- [x] T032 Ensure auto-cashout event payloads include enough data for clients:
  `roundId`, `betId`, `playerId`, `multiplierBps`, `payoutCents`, `cashoutTrigger`, and
  `autoCashoutMultiplierBps`.
- [x] T033 Keep Wallet payout-credit request timing on the existing crash/reconciliation settlement
  path unless implementation findings prove immediate payout is simpler and equally idempotent.
- [x] T034 Ensure payout-credit idempotency remains stable per bet using
  `payout-credit:{roundId}:{betId}`, independent of manual vs auto trigger.
- [x] T035 Update `RoundRunnerService` running tick order to evaluate auto-cashout before
  publishing the visible multiplier tick and before crashing at or above crash.
- [x] T036 Add concise lifecycle logging for auto-cashout acceptance using the existing log helper,
  without logging secrets or unrevealed server seeds.
- [x] T037 Ensure `npm run smoke:api` can still place a bet without `autoCashoutMultiplierBps`.

## Phase 4. Persistence and Migration

- [x] T038 Add a Game MikroORM migration for nullable `bets.auto_cashout_multiplier_bps` and
  `bets.cashout_trigger`.
- [x] T039 Add simple SQL constraints for auto-cashout bounds and known trigger values if they can
  be made repeatable without brittle migration logic.
- [x] T040 Update Game MikroORM `BetEntity` with nullable `autoCashoutMultiplierBps` and
  `cashoutTrigger` fields.
- [x] T041 Update Game MikroORM `betSchema` field mappings for `auto_cashout_multiplier_bps` and
  `cashout_trigger`.
- [x] T042 Update `MikroOrmRoundRepository` persistence mapping to write the new bet fields.
- [x] T043 Update `MikroOrmRoundRepository` rehydration mapping to read null values as disabled
  auto-cashout and undefined/null trigger.
- [x] T044 Update in-memory Game round repository behavior if tests require explicit snapshot
  preservation of new fields.
- [x] T045 Confirm no Wallet database migration or Wallet public API change is introduced.

## Phase 5. REST, Shared Contracts, and Swagger

- [x] T046 Update `PlaceBetRequestDto` with optional nullable `autoCashoutMultiplierBps` Swagger
  metadata, minimum `11000`, and maximum `1000000`.
- [x] T047 Update `GamesController` integer validation to validate `autoCashoutMultiplierBps` only
  when present and non-null.
- [x] T048 Update controller/application call sites so `POST /games/bet` forwards
  `autoCashoutMultiplierBps` to `GameStateService.placeBet(...)`.
- [x] T049 Update shared contract types in `packages/contracts` only where useful for
  `bet.accepted` or `cashout.accepted` payload typing; do not add new RabbitMQ routing keys.
- [x] T050 Confirm `POST /games/bet/cashout` request shape remains unchanged.
- [x] T051 Confirm `GET /games/rounds/:roundId/verify` response remains unchanged.
- [x] T052 Confirm public Wallet REST remains limited to `POST /wallets` and `GET /wallets/me`.

## Phase 6. Frontend Implementation

- [x] T053 Update `frontend/src/types.ts` `Bet` shape with optional `autoCashoutMultiplierBps` and
  `cashoutTrigger`.
- [x] T054 Update `frontend/src/services/api.ts` `placeBet(...)` to accept optional/null
  `autoCashoutMultiplierBps` and serialize the additive field only when intended.
- [x] T055 Add frontend helper functions for formatting multiplier basis points and converting a
  user-entered multiplier target to integer basis points.
- [x] T056 Add compact auto-cashout enabled/disabled control to the existing bet controls, with a
  bounded target input or stepper from `1.10x` through `100.00x`.
- [x] T057 Ensure the UI does not offer target edit/cancel controls after the player has an
  accepted bet in the current round.
- [x] T058 Update current-player bet status display to show the configured target when pending.
- [x] T059 Update current bets and my bets displays to show concise auto/manual cashout result
  status without adding a new panel or redesigning the game screen.
- [x] T060 Update frontend telemetry, if needed, to include auto-cashout fields without logging
  tokens, PKCE data, secrets, or unrevealed seeds.
- [ ] T061 Check desktop and mobile layout manually or with screenshots if the auto-cashout control
  makes the bet panel crowded. Docker demo is now available at `http://localhost:3000`; manual
  desktop/mobile visual review remains to be performed.

## Phase 7. Focused Validation

- [x] T062 Run `npx.cmd tsc -p services/games/tsconfig.json --noEmit`.
- [x] T063 Run `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`.
- [x] T064 Run `npx.cmd tsc -p frontend/tsconfig.json --noEmit`.
- [x] T065 Run `docker compose run --rm games bun test tests/unit`.
- [x] T066 Run `docker compose run --rm games bun test tests/e2e`.
- [x] T067 Run `docker compose run --rm wallets bun test tests/unit`.
- [x] T068 Run `docker compose run --rm wallets bun test tests/e2e`.
- [x] T069 Run `npm.cmd --workspace frontend run test`.
- [x] T070 Run `npm.cmd --workspace frontend run build`.
- [x] T071 Run `docker compose config --quiet`.
- [x] T072 Run or verify `games-migrations` applies the new Game migration repeatably.
- [x] T073 Run `npm run demo:up` and confirm evaluator startup remains valid.
- [x] T074 Run `npm run smoke:api` and confirm the deterministic smoke still passes when
  auto-cashout is absent from the bet request.
- [ ] T075 If practical, add and run an additive deterministic API smoke assertion for an
  auto-cashout bet without replacing the existing required smoke path. Not added in this slice;
  auto-cashout remains covered by Game unit/e2e tests and the required smoke path stays unchanged.
- [x] T076 Run a final domain boundary search for forbidden infrastructure/framework/DTO imports in
  Game and Wallet domain folders.
- [x] T077 Run a final money arithmetic search confirming bet amounts, debits, payouts, and wallet
  balances still use integer cents and multiplier basis points.

## Phase 8. Documentation Closeout

- [x] T078 Update `README.md` with a concise player-facing auto-cashout note and any changed
  validation commands.
- [x] T079 Update `docs/domain-model.md` with `Bet.autoCashoutMultiplierBps`,
  `cashoutTrigger`, auto-cashout bounds, and crash-wins boundary behavior.
- [x] T080 Update `docs/architecture.md` if runner ordering, socket payloads, or operational notes
  materially change.
- [x] T081 Update `docs/architecture-decisions.md` only if implementation chooses a meaningful
  trade-off beyond this plan, such as immediate payout requests instead of settlement-time payout
  requests. No ADR update needed because auto-cashout retained the existing settlement-time payout
  path and idempotency key.
- [x] T082 Update `docs/handoff.md` with implementation status, validation results, blocked checks,
  residual manual smoke, and any operational notes.
- [x] T083 Update `docs/roadmap.md` with Phase 4 auto-cashout progress and remaining bonus
  candidates.
- [x] T084 Update `docs/next-spec-prompt.md` with the next useful Spec Kit prompt after
  auto-cashout.
- [x] T085 Confirm final implementation report states validation run, validation blocked, manual
  smoke results, and residual follow-up work.

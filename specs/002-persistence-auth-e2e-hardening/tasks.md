# Tasks: Persistence, Auth, and E2E Hardening

**Input**: `specs/002-persistence-auth-e2e-hardening/plan.md`  
**Spec**: `specs/002-persistence-auth-e2e-hardening/spec.md`  
**Status**: Ready for `/speckit-implement`

## Phase 0. Guardrails

- [x] T001 Review `README.md`, `docs/`, `.specify/memory/constitution.md`, and all
  `specs/002-persistence-auth-e2e-hardening/*` artifacts before implementation.
- [x] T002 Confirm the implementation keeps DDD boundaries, server-authoritative gameplay,
  integer cents, multiplier basis points, RabbitMQ wallet effects, Keycloak primary auth, and
  existing public route shapes.
- [x] T003 Inspect current provider wiring in `services/games/src/app.module.ts` and
  `services/wallets/src/app.module.ts`; record the current in-memory/internal-HTTP defaults before
  changing them.
- [x] T004 Verify local tooling availability for the implementation environment: Bun, Docker,
  Docker Compose, and npm workspace commands.
  - Result: Docker, Docker Compose, npm, and npx are available. Bun is not on this PowerShell PATH,
    so Bun commands may need the installed Bun executable path or a separate shell during validation.

## Phase 1. Runtime Configuration

- [x] T005 Add explicit runtime configuration for `PERSISTENCE_ADAPTER=postgres|memory`,
  `WALLET_EFFECT_ADAPTER=rabbitmq|internal-http|immediate`, and `AUTH_MODE=keycloak|dev`.
- [x] T006 Set Docker/local challenge defaults to `postgres`, `rabbitmq`, and `keycloak` in tracked
  env/config files.
- [x] T007 Keep memory persistence, internal Wallet HTTP effects, immediate wallet effects, and
  `x-player-id` fallback available only behind explicit dev/smoke configuration.
- [x] T008 Add clear startup errors when Docker/local mode selects PostgreSQL, RabbitMQ, or Keycloak
  but required connection settings are missing.

## Phase 2. Migration Automation

- [x] T009 Add `migration:up` scripts to `services/games/package.json` and
  `services/wallets/package.json` using each service's MikroORM config path.
- [x] T010 Add one-shot Docker Compose migration services for Game and Wallet that depend on
  healthy PostgreSQL.
- [x] T011 Make `games` depend on successful Game migrations and `wallets` depend on successful
  Wallet migrations before service startup.
- [x] T012 Preserve PostgreSQL 18 volume path `/var/lib/postgresql` and verify
  `docker/postgres/init-databases.sh` remains LF and `/bin/sh` compatible.
- [x] T013 Validate migration command behavior manually against the Docker PostgreSQL databases:
  first run applies migrations, second run completes with no unexpected pending work.

## Phase 3. Game Persistence Tests

- [x] T014 Add Game e2e/integration coverage proving current round, completed history, player bet
  history, and verification metadata survive Game Service/repository restart.
- [x] T015 Add Game e2e/integration coverage for a running/interrupted round with accepted bets:
  the round record, accepted bets, wallet operation keys, and explainable outcome are preserved.
- [x] T016 Add Game repository coverage for `getCurrent`, `saveCurrent`, `createNext`,
  `addCompleted`, `getHistory`, `getCompleted`, and `getPlayerRoundSnapshots`.

## Phase 4. Game PostgreSQL Runtime

- [x] T017 Complete `MikroOrmRoundRepository` so all `RoundRepository` methods are implemented
  using PostgreSQL-backed MikroORM entities.
- [x] T018 Ensure Game persistence upserts rounds and bets transactionally and preserves one
  accepted bet per player per round.
- [x] T019 Persist completed-round reveal data, `houseEdgeBps = 100`, SHA-256/HMAC-SHA256 formula
  metadata inputs, crash timestamps, and settlement timestamps.
- [x] T020 Add or adjust Game migrations/indexes/constraints needed for round lookup, player bet
  history, unique per-player round bets, and message receipts.
- [x] T021 Wire `ROUND_REPOSITORY` to `MikroOrmRoundRepository` when `PERSISTENCE_ADAPTER=postgres`;
  keep `InMemoryRoundRepository` only for explicit memory mode.

## Phase 5. Game Restart Reconciliation

- [x] T022 Add a small Game startup reconciliation path in the application layer or round runner
  that loads active rounds from PostgreSQL.
- [x] T023 Preserve accepted bets and wallet-effect records when a betting or running round is found
  after restart.
- [x] T024 If exact running timer resume is not reliable, reconcile interrupted running rounds to an
  explainable terminal outcome without deleting player-visible participation, then open a new
  betting round.
- [x] T025 Resume idempotent payout settlement for crashed but unsettled rounds after restart.
- [x] T026 Document any lifecycle status change, especially if implementation introduces a
  `reconciled` status.

## Phase 6. Wallet Persistence Tests

- [x] T027 Add Wallet e2e/integration coverage proving seeded balance, accepted debit, payout
  credit, and operation ledger entries survive Wallet Service/repository restart.
- [x] T028 Add Wallet e2e/integration coverage proving duplicate `seed_credit`, `debit_bet`, and
  `credit_payout` idempotency keys return the prior outcome without duplicating balance effects.
- [x] T029 Add Wallet e2e/integration coverage proving insufficient balance cannot make balance
  negative and returns a stable rejection result.

## Phase 7. Wallet PostgreSQL Runtime

- [x] T030 Implement MikroORM Wallet repository for `findByPlayerId` and `save`, including
  balance/version persistence.
- [x] T031 Implement MikroORM Wallet operation repository with database-backed idempotency by
  unique idempotency key.
- [x] T032 If needed, minimally extend `WalletOperationRepository` so duplicates can return the
  previously recorded accepted/rejected outcome; update in-memory adapters and tests accordingly.
- [x] T033 Ensure debit, payout credit, and seed credit update wallet balance and operation ledger
  in one transaction.
- [x] T034 Add or adjust Wallet migrations/indexes/constraints for unique `player_id`, unique
  `idempotency_key`, operation lookup, and non-negative balance protection where practical.
- [x] T035 Wire `WALLET_REPOSITORY` and `WALLET_OPERATION_REPOSITORY` to MikroORM implementations
  when `PERSISTENCE_ADAPTER=postgres`; keep in-memory adapters only for explicit memory mode.

## Phase 8. RabbitMQ Default Wallet Effects

- [x] T036 Wire Game `GAME_WALLET_GATEWAY` to `RabbitMqGameWalletGateway` by default when
  `WALLET_EFFECT_ADAPTER=rabbitmq`.
- [x] T037 Keep `HttpGameWalletGateway` and `ImmediateGameWalletGateway` available only for explicit
  dev/smoke modes.
- [x] T038 Ensure Wallet RabbitMQ consumer uses the PostgreSQL wallet repositories and operation
  ledger when `PERSISTENCE_ADAPTER=postgres`.
- [x] T039 Ensure Game accepts a bet only after an accepted Wallet debit result and returns a
  retryable wallet-confirmation state on timeout without creating an accepted bet.
- [x] T040 Ensure payout credit requests and result handling are idempotent and do not duplicate
  wallet credits on duplicate messages.
- [x] T041 Add or complete Game message receipt handling for duplicate wallet result messages.

## Phase 9. API and RabbitMQ E2E Coverage

- [x] T042 Add Game e2e coverage for bet accepted after Wallet confirmation.
- [x] T043 Add Game e2e coverage for wallet timeout/retry without accepted bet creation.
- [x] T044 Add Game/Wallet e2e coverage for insufficient balance, duplicate bet, invalid phase, and
  invalid amount.
- [x] T045 Add Game/Wallet e2e coverage for cashout accepted before crash and payout credited
  exactly once.
- [x] T046 Add Game/Wallet e2e coverage for cashout rejected after crash with no payout credit.
- [x] T047 Add e2e coverage proving seeded wallet balance is created through idempotent
  `seed_credit`.
- [x] T048 Add e2e coverage proving completed-round verification metadata recomputes the recorded
  crash multiplier.
- [x] T049 Add RabbitMQ e2e coverage proving duplicate debit and payout messages do not duplicate
  debits or credits.

## Phase 10. Keycloak Primary Auth

- [x] T050 Tighten backend guards so Keycloak mode derives `PlayerId` from bearer JWT `sub` and dev
  `x-player-id` fallback only works in explicit dev mode.
- [x] T051 Add deterministic API/e2e auth support using the existing Keycloak realm/token setup
  where practical, avoiding a large custom auth harness.
- [x] T052 Update frontend auth helpers so normal Docker/local mode routes unauthenticated users
  through Keycloak OIDC PKCE.
- [x] T053 Ensure frontend API calls attach bearer tokens in Keycloak mode.
- [x] T054 Hide local player-id controls unless explicit dev/smoke mode is enabled.
- [x] T055 Add or update frontend tests for auth mode selection, bearer-token request headers, and
  dev identity visibility.

## Phase 11. Frontend Realtime and Responsive Validation

- [x] T056 Add a visible session indicator that clearly distinguishes Keycloak identity from dev
  identity without redesigning the game UI.
- [x] T057 Verify WebSocket reconnect refetches snapshots and reconciles Zustand hot projection with
  server truth.
- [x] T058 Add automated two-client convergence coverage if feasible with a small harness, proving
  both clients converge on phase, accepted bets, cashout/crash result, wallet effects, and history.
- [x] T059 If full two-client automation is too costly, write a documented manual two-client smoke
  script with exact steps and expected observations.
- [x] T060 Validate desktop and mobile widths for usable game scene, wallet/player status, bet
  controls, cashout controls, history, and verification areas with no incoherent overlap.
- [x] T061 Validate goat sprite replacement remains presentation-only and does not affect game
  logic, REST, WebSocket, wallet effects, or payout results.

## Phase 12. Docker and Operational Smoke

- [x] T062 Run `docker compose config` and fix any migration-service or dependency-ordering issues.
- [x] T063 Run `bun run docker:up` or the equivalent Compose startup and confirm migrations run
  automatically before Game and Wallet services start.
- [x] T064 Validate direct service health endpoints for Games and Wallets.
- [x] T065 Validate Kong health routes for Games and Wallets.
- [x] T066 Validate normal Docker/local gameplay through Keycloak login: wallet seed/read, bet,
  cashout or crash, wallet/history update, and verification view.
- [x] T067 Validate explicit dev/smoke mode still works when intentionally enabled and is visibly
  labeled.

## Phase 13. Final Automated Validation

- [x] T068 Run `npx.cmd tsc -p services/games/tsconfig.json --noEmit`.
- [x] T069 Run `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`.
- [x] T070 Run `npx.cmd tsc -p frontend/tsconfig.json --noEmit`.
- [x] T071 Run `cd services/games && bun test tests/unit`.
- [x] T072 Run `cd services/wallets && bun test tests/unit`.
- [x] T073 Run `cd services/games && bun test tests/e2e`.
- [x] T074 Run `cd services/wallets && bun test tests/e2e`.
- [x] T075 Run `npm.cmd --workspace frontend run test`.
- [x] T076 Run `npm.cmd --workspace frontend run build`.
- [x] T077 Run a final domain boundary search for forbidden NestJS, MikroORM, RabbitMQ, WebSocket,
  controller, and DTO imports in Game and Wallet domain folders.
- [x] T078 Run a final money arithmetic search and confirm money uses integer cents with no
  floating-point balance, bet, debit, credit, or payout arithmetic.

## Phase 14. Documentation Closeout

- [x] T079 Update `README.md` with automatic migration startup, manual MikroORM migration tutorial,
  auth modes, e2e commands, Docker startup, and known limitations.
- [x] T080 Update `docs/architecture.md` with final runtime provider defaults, RabbitMQ default
  wallet effects, migration setup, and auth mode behavior.
- [x] T081 Update `docs/domain-model.md` for any wallet idempotency or round restart lifecycle
  refinements introduced during implementation.
- [x] T082 Update `docs/architecture-decisions.md` with migration automation, RabbitMQ default
  transport, and active-round restart reconciliation trade-offs.
- [x] T083 Update `docs/handoff.md` with implementation status, validation results, residual risks,
  and any checks that could not run.
- [x] T084 Update `docs/roadmap.md` with Phase 3.5 progress and remaining gates.
- [x] T085 Update `docs/next-spec-prompt.md` with the next useful Spec Kit prompt after hardening.
- [x] T086 Confirm final implementation report states validation run, validation blocked, manual
  smoke results, and residual follow-up work.

# Tasks: Gameplay Foundation

**Input**: `specs/001-gameplay-foundation/plan.md`  
**Spec**: `specs/001-gameplay-foundation/spec.md`  
**Status**: Updated for active `/speckit-implement`

## Phase 0. Guardrails

- [x] T001 Review `README.md`, `docs/`, `.specify/memory/constitution.md`, and all
  `specs/001-gameplay-foundation/*` artifacts before implementation.
- [x] T002 Confirm implementation keeps KISS, DDD layer boundaries, server-authoritative gameplay,
  money-in-cents, multiplier-basis-points, and official route shape.
- [x] T003 Verify the local environment has Bun, Docker, and Docker Compose available before running
  installation or stack commands.
  - Result: Docker, Docker Compose, and Bun are available after adding Bun to the Git Bash PATH.

## Phase 1. Workspace and Dependencies

- [x] T004 Add required backend dependencies to `services/games` and `services/wallets`: MikroORM,
  PostgreSQL driver, RabbitMQ client, Swagger/OpenAPI, validation/config utilities, WebSocket
  support, and JWT/OIDC verification utilities.
- [x] T005 Scaffold `frontend/` as Vite React with TypeScript, Tailwind CSS v4, shadcn/ui,
  TanStack Query, Zustand, router/auth helpers, and test tooling.
- [x] T006 Create a minimal shared package only for cross-service event names/payload types and
  serialization helpers; do not place Game or Wallet domain entities in shared code.
- [x] T007 Update Dockerfiles/package scripts as needed so services and frontend can run under
  `bun run docker:up`.
- [x] T008 Validate dependency setup with `bun install` and record any environment-specific issue
  in `docs/handoff.md`.
  - Result: `bun install` completed successfully after installing Bun and loading it from
    `$HOME/.bun/bin`.

## Phase 2. Domain Foundation Tests

- [x] T009 Add Game domain unit tests for `Money`, `PlayerId`, `CrashPoint`, and provably fair
  deterministic verification.
- [x] T010 Add Game domain unit tests for `Round` lifecycle: betting, running, crashed, settled,
  invalid transitions, and one accepted bet per player.
- [x] T011 Add Game domain unit tests for `Bet`: min/max amount, pending/cashed-out/lost status,
  cashout once, payout in cents, and no float arithmetic.
- [x] T012 Add Wallet domain unit tests for wallet creation, debit, credit, insufficient balance,
  idempotency key reuse, and no negative balance.

## Phase 3. Game Domain and Application

- [x] T013 Implement Game domain value objects, statuses, errors, `Bet`, `Round`, and simple
  hash-chain plus HMAC provably fair calculator in `services/games/src/domain`.
- [x] T014 Implement Game application ports for round repository, bet history queries, wallet event
  publisher/result listener, clock/id generation, and WebSocket event publishing.
- [x] T015 Implement Game use cases for current round, round history, player bet history, verify
  round, place bet, cashout, round lifecycle tick/start/crash/settle, and wallet result handling.
  Verification must expose SHA-256/HMAC-SHA256 formula metadata and `houseEdgeBps = 100`.
- [x] T016 Validate Game domain/application with `cd services/games && bun test tests/unit`.
  - Result: 8 Game unit tests passed with Bun.

## Phase 4. Wallet Domain and Application

- [x] T017 Implement Wallet domain value objects, wallet aggregate, operation ledger identity,
  statuses, and domain errors in `services/wallets/src/domain`.
- [x] T018 Implement Wallet application ports for wallet repository, operation repository,
  RabbitMQ result publisher, clock/id generation, and auth player extraction.
- [x] T019 Implement Wallet use cases for create wallet, get wallet, debit/reserve bet, credit
  payout, and idempotent message handling.
- [x] T020 Validate Wallet domain/application with `cd services/wallets && bun test tests/unit`.
  - Result: 3 Wallet unit tests passed with Bun.

## Phase 5. Persistence and Migrations

- [x] T021 Add MikroORM configuration, entities/mappings, repositories, and migrations for Game DB:
  `rounds`, `bets`, and `game_message_receipts`, including `house_edge_bps` on rounds and
  provably fair metadata needed for completed-round verification.
- [x] T022 Add MikroORM configuration, entities/mappings, repositories, and migrations for Wallet DB:
  `wallets` and `wallet_operations`, including `seed_credit` operation type support.
- [x] T023 Ensure domain code does not import `@mikro-orm/*`, NestJS, RabbitMQ, WebSocket, DTOs, or
  controller types.
- [x] T024 Add seed/local setup path for the Keycloak test player wallet that records a
  `seed_credit` wallet operation without exposing arbitrary public wallet credit/debit REST
  endpoints.
- [ ] T025 Validate migrations in Docker or local DB and document exact migration command in
  `README.md`.
  - Remaining: Docker Postgres starts and creates the `games`/`wallets` databases, but MikroORM
    migrations have not been executed against Postgres and runtime providers still use in-memory
    repositories.

## Phase 6. RabbitMQ Integration

- [x] T026 Implement shared RabbitMQ event contracts for `wallet.bet_debit_requested`,
  `wallet.payout_credit_requested`, `wallet.bet_debit_accepted`,
  `wallet.bet_debit_rejected`, `wallet.payout_credit_accepted`, and
  `wallet.payout_credit_rejected`.
- [x] T027 Implement Game RabbitMQ publisher/result consumer adapters with idempotency receipt
  tracking.
- [x] T028 Implement Wallet RabbitMQ request consumers/result publishers with operation ledger
  idempotency.
- [x] T029 Implement reserve/debit-first bet acceptance so `POST /games/bet` confirms only after
  Wallet accepted result or returns a clear retryable wallet-confirmation timeout state. Timeout
  must not mark the bet accepted, and retry behavior must remain safe through idempotency keys.
- [ ] T030 Add integration/e2e coverage for duplicate RabbitMQ wallet messages not duplicating
  debits or credits, plus timeout/retry behavior for pending wallet confirmation.
  - Remaining: no automated RabbitMQ/e2e coverage exists yet; local gameplay smoke uses an internal
    HTTP wallet gateway for immediate debit/credit confirmation.

## Phase 7. REST, Auth, and API Docs

- [x] T031 Implement Keycloak JWT validation guards/adapters for authenticated Game and Wallet
  endpoints while keeping `PlayerId` as the domain input.
- [x] T032 Implement Game REST endpoints: current round, round history, verify round, player bet
  history, place bet, and cashout.
- [x] T033 Implement Wallet REST endpoints: create wallet and get current wallet.
- [x] T034 Add DTO validation, consistent error responses, and Swagger/OpenAPI annotations for all
  REST routes.
- [ ] T035 Validate API behavior with e2e tests for bet accepted, wallet-confirmation timeout,
  insufficient balance, duplicate bet, invalid phase, invalid amount, cashout accepted, cashout
  rejected after crash, seeded wallet balance through `seed_credit`, and verify round metadata.
  - Partial result: local API smoke validated health checks, seeded wallet, debit on bet, cashout
    payout credit, and verification/history behavior manually. Automated e2e coverage remains open.

## Phase 8. Round Runner and WebSocket

- [x] T036 Implement a simple in-process Game round runner for betting window, running multiplier,
  crash, settlement, and next round creation.
- [x] T037 Implement server-to-client WebSocket gateway events with NestJS WebSockets and the
  simplest Socket.IO-compatible adapter by default: `round.betting_opened`, `round.started`,
  `round.multiplier`, `round.crashed`, `round.settled`, `bet.accepted`, `cashout.accepted`,
  `cashout.rejected`, and `history.updated`.
- [x] T038 Ensure WebSocket events include round id, server timestamp, and enough state for
  frontend projection/recovery.
- [ ] T039 Add realtime smoke/e2e coverage or documented manual smoke for two clients converging on
  betting, running, crashed, and settled states.
  - Remaining: one-client manual/browser smoke was performed; two-client convergence is still open.

## Phase 9. Frontend Game Experience

- [x] T040 Implement frontend auth flow with Keycloak OIDC PKCE and authenticated API calls.
- [x] T041 Implement TanStack Query hooks for wallet, current round, round history, player bet
  history, and verification data.
- [x] T042 Implement Zustand hot game state for phase, displayed multiplier, countdown, visible
  bets, WebSocket status, cashout pending/accepted/rejected, and goat animation flags.
- [x] T043 Implement WebSocket client that updates Zustand and refetches snapshots on reconnect or
  suspected event gaps.
- [x] T044 Build the game screen as the first authenticated screen: goat/mountain scene, multiplier,
  bet controls, cashout controls, player wallet, current bets, round history, verification panel,
  loading states, and toast errors.
- [x] T045 Implement latency-aware cashout UI: immediate pending/smooth feedback followed by clear
  accepted or rejected server reconciliation.
- [x] T046 Use placeholder goat/mountain SVG or CSS assets in a replaceable way; do not couple game
  state logic to final artwork.
- [ ] T047 Validate responsive desktop/mobile layout, no text overlap, and no card-inside-card UI
  patterns.
  - Partial result: desktop manual screenshots were reviewed; mobile responsive validation remains
    open.

## Phase 10. Docker and Operational Smoke

- [x] T048 Enable the frontend service in `docker-compose.yml` with its Dockerfile and port `3000`.
- [ ] T049 Ensure `bun run docker:up` runs infrastructure, services, migrations/setup, and frontend
  without manual infrastructure steps.
  - Partial result: `docker compose up -d` starts infrastructure, services, and frontend after
    fixing Postgres 18 volume layout and init script line endings. MikroORM migration execution is
    still not wired into startup.
- [x] T050 Validate `docker compose config`.
- [x] T051 Validate health checks through direct service ports and Kong routes.
  - Result: direct `games`/`wallets` health endpoints and Kong `/games/health` plus
    `/wallets/health` returned `{"status":"ok"}` after container rebuild and Kong restart.
- [ ] T052 Run the full local gameplay smoke: login, seeded wallet balance, bet, multiplier,
  wallet-confirmation timeout/retry if reproducible, cashout or crash, wallet/history update, and
  verification view.
  - Partial result: local identity smoke validated wallet seed balance, bet debit, runner loop,
    cashout payout credit, history, verification view, and frontend sprite assets. Real Keycloak
    login, RabbitMQ timeout/retry, and two-client smoke remain open.

## Phase 11. Final Validation

- [x] T053 Run `cd services/games && bun test tests/unit`.
  - Result: 8 tests passed.
- [x] T054 Run `cd services/wallets && bun test tests/unit`.
  - Result: 3 tests passed.
- [ ] T055 Run `cd services/games && bun test tests/e2e`.
  - Remaining: command ran, but Bun found no matching `tests/e2e` test files.
- [x] T056 Run frontend tests from `frontend/`.
- [x] T057 Run a final search to verify domain layers do not import forbidden infrastructure,
  framework, DTO, or WebSocket modules.
- [x] T058 Run a final search for floating point money arithmetic and confirm money uses cents.

## Phase 12. Documentation Closeout

- [x] T059 Update `README.md` with final setup, commands, routes, tests, architecture trade-offs,
  and known limitations.
- [x] T060 Update affected docs in `docs/`, including architecture decisions if the implementation
  keeps an in-process round runner, Socket.IO WebSocket transport, retryable wallet-confirmation
  timeout behavior, or any other meaningful trade-off.
- [x] T061 Update `docs/handoff.md` with implementation status, validation results, remaining work,
  and operational notes.
- [x] T062 Update `docs/roadmap.md` to reflect MVP implementation progress and gates.
- [x] T063 Update `docs/next-spec-prompt.md` with the next useful Spec Kit prompt after
  implementation, likely focused on polish or a deferred bonus only after MVP gates pass.

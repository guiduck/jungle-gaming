# Tasks: Challenge Polish and Operational Confidence

**Input**: `specs/003-challenge-polish-operational-confidence/plan.md`  
**Spec**: `specs/003-challenge-polish-operational-confidence/spec.md`  
**Status**: Implemented and validated. Optional browser PKCE automation remains deferred; the
required fast validation path is `npm run smoke:api`.

## Phase 0. Guardrails

- [x] T001 Review `README.md`, `docs/`, `.specify/memory/constitution.md`, and all
  `specs/003-challenge-polish-operational-confidence/*` artifacts before implementation.
- [x] T002 Confirm the implementation preserves existing public REST routes, RabbitMQ wallet-effect
  contracts, WebSocket projection events, Keycloak-first auth, Game/Wallet DDD boundaries, integer
  cents, multiplier basis points, and SHA-256/HMAC-SHA256 verification semantics.
- [x] T003 Inspect current root `package.json`, `docker-compose.yml`, service package scripts,
  health endpoints, Keycloak realm defaults, and existing service test commands before adding demo
  or smoke scripts.
- [x] T004 Verify local tool availability for the implementation environment: npm/npx, Docker,
  Docker Compose, and Bun availability through containerized service commands.

## Phase 1. Script Scaffolding and Contracts

- [x] T005 Create a root `scripts/` workspace for evaluator/demo tooling without introducing a new
  top-level artifact pattern elsewhere.
- [x] T006 Add root package scripts `demo:up` and `smoke:api`; keep existing `docker:up`,
  `docker:down`, and `docker:prune` unchanged.
- [x] T007 Decide whether `smoke:browser` will be automated or documented manually based on
  lightweight Playwright feasibility; add the root script only if automation is implemented.
- [x] T008 Add reusable script helpers for command execution, timeout/polling, HTTP requests,
  Keycloak token acquisition, assertion failures, and pass/fail output.
- [x] T009 Ensure all scripts exit non-zero on failed prerequisites, health checks, smoke
  assertions, or unexpected response shapes.
- [x] T010 Ensure scripts print focused diagnostic commands for common failures: Docker engine not
  running, Compose service unhealthy, Keycloak warmup, Kong upstream unavailable, and failed smoke
  assertion.

## Phase 2. Demo Startup Command

- [x] T011 Implement `npm run demo:up` so it starts or verifies the Docker Compose stack.
- [x] T012 Add Docker and Compose readiness checks that clearly distinguish missing Docker from a
  stopped/unavailable Docker Desktop Linux engine.
- [x] T013 Wait for `games-migrations` and `wallets-migrations` completion or already-latest/no-op
  status and surface migration failures clearly.
- [x] T014 Poll direct Game and Wallet health endpoints until healthy or timeout.
- [x] T015 Poll Kong Game and Wallet health routes until healthy or timeout.
- [x] T016 Poll frontend reachability at `http://localhost:3000` until reachable or timeout.
- [x] T017 Account for Keycloak first-start warmup with clear progress output and retry guidance.
- [x] T018 Print the demo startup result fields: frontend URL, Kong URL, Games Swagger URL, Wallets
  Swagger URL, Keycloak URL, direct/Kong health URLs, `player` / `player123`, realm/client, and
  next commands.
- [x] T019 Validate `demo:up` handles an already-running stack without treating existing services
  as failure.

## Phase 3. Deterministic Smoke Boundary Tests

- [x] T020 Choose the smallest deterministic smoke mechanism: demo/test-only next-round seed,
  application harness, or explicit dev/smoke configuration.
- [x] T021 Gate any service-side deterministic behavior behind an explicit local demo/test flag such
  as `DEMO_DETERMINISTIC_ROUNDS` or a similarly narrow name.
- [x] T022 Keep deterministic behavior out of domain invariants and out of public player-facing
  crash-control routes.
- [x] T023 Add focused Game tests proving deterministic demo/test setup derives a known crash
  multiplier while preserving SHA-256 commitment and HMAC-SHA256 verification recomputation.
- [x] T024 Add tests or assertions proving deterministic demo/test setup is disabled in normal
  player-facing runtime.
- [x] T025 Add smoke setup idempotency tests or assertions proving repeat runs do not duplicate
  `seed_credit`, accepted bets, debit effects, or payout effects.
- [x] T026 Confirm no database migration is needed for deterministic smoke; if implementation
  proves otherwise, document the reason in `docs/architecture-decisions.md` and update plan artifacts
  before proceeding.

## Phase 4. Deterministic API Smoke

- [x] T027 Implement Keycloak token acquisition for the local demo user in `npm run smoke:api`.
- [x] T028 Implement API smoke health checks for direct services and Kong routes.
- [x] T029 Implement wallet create/read smoke through public Wallet routes.
- [x] T030 Verify approved seed/bootstrap behavior and idempotent `seed_credit` outcome.
- [x] T031 Prepare or select deterministic round behavior without relying on natural crash luck.
- [x] T032 Place a bet through Kong and assert Game accepts it only after Wallet debit
  confirmation.
- [x] T033 Assert post-bet Wallet balance decreases by the exact integer-cent bet amount.
- [x] T034 Perform a known-safe cashout or deterministic crash-loss path according to the selected
  smoke mechanism.
- [x] T035 Assert final Wallet balance, bet status, payout cents, crash/cashout multiplier basis
  points, round history, and player bet history where useful.
- [x] T036 Fetch verification data and recompute the recorded crash multiplier from the revealed
  SHA-256/HMAC-SHA256 metadata.
- [x] T037 Print the required smoke pass summary: player id, round id, bet id, starting balance,
  final balance, bet amount, cashout/crash multiplier, payout, and verification result.
- [x] T038 Ensure smoke assertion failures print the route/event involved plus expected and actual
  values.

## Phase 5. Lifecycle and Integration Logs

- [x] T039 Add or reuse a small log formatting helper for stable single-line lifecycle events if it
  reduces duplicated formatting.
- [x] T040 Add Game startup logs for persistence adapter, wallet-effect adapter, auth mode,
  migration dependency assumption, and restart reconciliation summary.
- [x] T041 Add Game round lifecycle logs for betting opened, round started, round crashed, round
  settled, and next-round creation.
- [x] T042 Add Game wallet-effect logs for debit request, payout request, accepted/rejected result,
  duplicate result, and timeout.
- [x] T043 Add Wallet logs for wallet creation/read when useful, seed credit, debit, payout credit,
  rejection, duplicate idempotency outcome, and non-negative balance protection.
- [x] T044 Add RabbitMQ publish/consume logs that include routing key, direction, idempotency key,
  correlation fields, and result.
- [x] T045 Add auth startup/rejection logs that identify Keycloak vs dev mode without logging bearer
  tokens or refresh tokens.
- [x] T046 Review log output to ensure bearer tokens, refresh tokens, client secrets, unrevealed
  server seeds, and private Keycloak material are not logged.
- [x] T047 Add focused tests or smoke assertions where practical for log helper field formatting and
  redaction expectations.

## Phase 6. Optional Browser PKCE Smoke

- [x] T048 Check whether lightweight Playwright-style automation can reliably open the frontend and
  click through Keycloak PKCE with `player` / `player123`.
- [ ] T049 If feasible, implement `npm run smoke:browser` to automate Keycloak login and validate
  authenticated game UI state.
- [ ] T050 If browser smoke is implemented, verify wallet, round phase, bet/cashout controls,
  history, verification, WebSocket status, and Keycloak identity indicator are visible.
- [ ] T051 If browser smoke is implemented, capture optional desktop and mobile screenshots under
  `output/playwright/` during validation.
- [x] T052 If browser automation is unreliable or too broad, document a manual PKCE checklist
  instead and keep `npm run smoke:api` as the required smoke command.
- [x] T053 Ensure browser validation does not replace API/service assertions for money, wallet,
  RabbitMQ, persistence, or verification correctness.

## Phase 7. Script and Service Validation

- [x] T054 Run `npm run demo:up` and confirm it prints demo URLs, credentials, health URLs, and next
  commands.
- [x] T055 Run `npm run smoke:api` and confirm the deterministic pass summary is printed.
- [ ] T056 Run `npm run smoke:browser` if implemented, or execute the documented manual PKCE
  checklist if not automated.
- [x] T057 Run `docker compose config --quiet`.
- [x] T058 Validate direct Game and Wallet health endpoints.
- [x] T059 Validate Kong Game and Wallet health routes.
- [x] T060 Validate Keycloak token acquisition for `player` / `player123`.
- [x] T061 Run `npx.cmd tsc -p services/games/tsconfig.json --noEmit`.
- [x] T062 Run `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`.
- [x] T063 Run `npx.cmd tsc -p frontend/tsconfig.json --noEmit`.
- [x] T064 Run `docker compose run --rm games bun test tests/unit`.
- [x] T065 Run `docker compose run --rm games bun test tests/e2e`.
- [x] T066 Run `docker compose run --rm wallets bun test tests/unit`.
- [x] T067 Run `docker compose run --rm wallets bun test tests/e2e`.
- [x] T068 Run `npm.cmd --workspace frontend run test`.
- [x] T069 Run `npm.cmd --workspace frontend run build`.
- [x] T070 Run a final domain boundary search for forbidden infrastructure, framework, DTO,
  browser automation, demo-script, or logging-framework-specific imports in Game and Wallet domain
  folders.
- [x] T071 Run a final money arithmetic search confirming wallet balances, bet amounts, debits,
  credits, payouts, and smoke assertions use integer cents and multiplier basis points.

## Phase 8. Operator Documentation

- [x] T072 Update `README.md` with `npm run demo:up`, `npm run smoke:api`, optional
  `npm run smoke:browser` or manual PKCE checklist, demo URLs, credentials, expected smoke output,
  and validation matrix.
- [x] T073 Update `README.md` with PowerShell and Bash examples where command syntax or environment
  variables differ.
- [x] T074 Update `README.md` with Keycloak first-start warmup notes and focused Docker
  Desktop/Compose diagnostic commands.
- [x] T075 Update `docs/architecture.md` if demo/test determinism or lifecycle logging changes
  runtime behavior or operational notes.
- [x] T076 Update `docs/architecture-decisions.md` only if the deterministic hook, logging helper,
  or browser smoke posture introduces a meaningful trade-off.
- [x] T077 Update any affected service `.env.example` files if new explicit demo/test flags are
  introduced.
- [x] T078 Ensure docs distinguish required fast API smoke from optional browser/manual smoke.

## Phase 9. Required Closeout

- [x] T079 Update `docs/handoff.md` with implementation status, validation results, blocked checks,
  residual manual smoke, and any operational notes.
- [x] T080 Update `docs/roadmap.md` with Phase 4 polish progress and remaining bonus candidates.
- [x] T081 Update `docs/next-spec-prompt.md` with the next useful Spec Kit prompt after challenge
  polish and operational confidence.
- [x] T082 Confirm final implementation report states validation run, validation blocked, manual
  smoke results, and residual follow-up work.

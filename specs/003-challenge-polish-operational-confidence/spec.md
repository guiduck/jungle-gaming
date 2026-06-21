# Feature Specification: Challenge Polish and Operational Confidence

**Feature Branch**: `003-challenge-polish-operational-confidence`  
**Created**: 2026-06-21  
**Status**: Planned  
**Input**: `docs/next-spec-prompt.md` and user `/speckit-specify` request

## Summary

Make Jungle Crash Game easier to evaluate, demo, and operate after the completed
`002-persistence-auth-e2e-hardening` slice. A reviewer should be able to start the local stack,
see exactly where to go, use deterministic credentials, run a deterministic smoke flow, and inspect
concise operational signals without learning the whole codebase first.

This feature does not change core gameplay or money correctness. It wraps the existing
server-authoritative Game/Wallet model, PostgreSQL persistence, RabbitMQ wallet effects, Keycloak
auth, Kong routes, and Vite React UI in evaluator-friendly scripts, logs, browser validation, and
copy-paste documentation.

## Existing Artifact Alignment

No conflicts were found between the request, `README.md`, `docs/`, the constitution, and the
completed `specs/001-gameplay-foundation/` and `specs/002-persistence-auth-e2e-hardening/`
artifacts.

The completed hardening slice already made PostgreSQL/MikroORM, RabbitMQ wallet effects, Keycloak
auth, restart reconciliation, and automated/containerized tests the Docker/local challenge
baseline. This feature must not re-open those foundations or weaken their contracts. It should
make them easier to prove and explain.

The roadmap already lists seeded deterministic e2e scenarios, Playwright/browser tests,
observability, and challenge polish as deferred bonus scope. This feature promotes the evaluator
confidence parts of that scope while keeping auto-cashout, leaderboard, richer history, sound
effects, final artwork, cloud deployment, and heavy monitoring infrastructure optional or future.

## Clarifications

- The one-command evaluator flow may be a wrapper around Docker Compose and existing workspace
  scripts, but it must remain transparent: failures should print the failing step and where to look
  next.
- The evaluator entrypoint should be exposed as a root package script, preferably
  `npm run demo:up`, so evaluators do not need to discover service-specific commands. It may wrap
  `docker compose up`, migration service checks, health polling, and URL/credential printing.
- The fast deterministic API smoke should be exposed as a root package script, preferably
  `npm run smoke:api`, and should work against the normal Docker/local Keycloak/RabbitMQ/PostgreSQL
  profile once the stack is healthy.
- Browser validation, if automated, should be exposed separately, preferably as
  `npm run smoke:browser`, so a browser tooling issue does not block the fast API smoke path.
- The deterministic smoke flow must not depend on a naturally lucky crash point. It may use a
  demo/test profile, deterministic server seeds, application test harness, or a scripted known-round
  setup, as long as normal gameplay remains server-authoritative and no public arbitrary wallet
  credit/debit REST API is introduced.
- The preferred deterministic mechanism is a test/demo-only next-round seed or harness that still
  uses the normal SHA-256 commitment and HMAC-SHA256 crash derivation. It must be disabled in normal
  player-facing runtime, must be documented as local challenge tooling, and must not add public
  endpoints for choosing crash points or mutating wallet balances.
- The deterministic smoke should use the seeded Keycloak demo user `player` / `player123` unless a
  later plan proves that creating separate smoke users is simpler and keeps docs clearer. Repeated
  runs must use idempotency keys or cleanup/setup logic that avoids duplicate wallet effects.
- Fast API/token-based smoke remains required because it is useful for local validation and CI-like
  checks. Browser Keycloak PKCE click-through is valuable polish, but must stay small enough that it
  does not become a brittle custom auth framework.
- Automated browser PKCE is considered feasible only if it can run with the existing local Keycloak
  realm, seeded demo credentials, and lightweight Playwright-style tooling without adding a custom
  auth service or broad test framework. If Keycloak timing or browser tooling makes it unreliable,
  preserve a manual PKCE checklist and keep `npm run smoke:api` as the required validation.
- Observability means structured or concise lifecycle logs, not dashboards. Logs should help a
  reviewer see round transitions, wallet operations, RabbitMQ publish/consume, migration startup,
  and auth mode.
- Lifecycle logs should use the existing NestJS logging path where practical and emit
  consistently-shaped single-line messages with stable fields. Adding a small formatting helper is
  acceptable; adding log aggregation, metrics infrastructure, or a new observability platform is
  not.
- Documentation should favor copy-paste commands for Windows PowerShell and Bash where syntax
  differs. It should call out Keycloak's first-start timing and known healthcheck warmup behavior.

## User Stories and Acceptance Criteria

### Story 1: Evaluator starts the demo from one command

As an evaluator, I want one documented command to start the stack, apply migrations, verify health,
and print demo entry points so I can begin reviewing quickly.

Acceptance criteria:

- Given a fresh checkout with Docker available, when the evaluator runs the documented demo command,
  then the command starts the Compose stack or verifies it is already running.
- Given databases are fresh, then Game and Wallet migrations run automatically before health checks
  are reported as passing.
- Given the stack becomes healthy, then the command prints frontend, Kong, Game Swagger, Wallet
  Swagger, Keycloak, and health URLs.
- Given demo credentials are available, then the command prints the test username, password,
  realm/client, and a warning that credentials are for local challenge delivery only.
- Given a dependency is unavailable or a service fails health checks, then the command exits
  non-zero and prints the failed step plus the relevant follow-up command.
- Given Keycloak is still bootstrapping, then the command waits or reports a clear warmup message
  instead of presenting a misleading failure.

### Story 2: Evaluator runs a deterministic gameplay smoke

As an evaluator, I want a deterministic smoke script that proves wallet seed, bet, cashout or crash,
history, and verification without waiting for a lucky round.

Acceptance criteria:

- Given the stack is running, when the deterministic smoke script runs, then it obtains or uses a
  valid Keycloak token for the demo player in normal Keycloak mode.
- Given the demo player has no wallet, then the smoke flow creates or seeds the wallet through the
  approved seed/bootstrap path and verifies the `seed_credit` outcome.
- Given a deterministic round or test harness is prepared, when the script places a bet, then the
  bet is accepted only after Wallet confirms the debit.
- Given the scripted round can safely cash out before crash, then the script performs cashout at a
  known multiplier and verifies exact wallet balance, bet status, payout cents, and history.
- Given the scripted round is intended to crash before cashout, then the script verifies the lost
  bet state and unchanged post-debit wallet balance.
- Given the round is completed, then the script fetches verification data and recomputes the
  recorded crash multiplier from SHA-256/HMAC-SHA256 metadata.
- Given the script runs more than once, then idempotent setup avoids duplicate seed credits,
  duplicate accepted bets for the same round, and duplicate wallet effects.
- Given any assertion fails, then the script prints the expected value, actual value, and route or
  event category involved.

### Story 3: Developer preserves fast local validation

As a developer, I want a fast smoke path that uses token/API calls without requiring a full browser
walkthrough so I can catch regressions quickly.

Acceptance criteria:

- Given the stack is running, when the fast smoke command runs, then it validates health, token
  acquisition, wallet read/create, bet placement, cashout or deterministic crash, history, and
  verification through APIs.
- Given browser tooling is unavailable, then the API smoke still provides meaningful confidence and
  exits with a clear status.
- Given the API smoke is documented, then it includes both PowerShell and Bash invocation examples
  when environment variables or quoting differ.
- Given the command completes, then it prints a short pass summary with player id, round id, bet id,
  starting balance, final balance, and verification result.

### Story 4: Browser validation covers Keycloak PKCE where feasible

As a reviewer, I want optional browser validation to prove the real login path and game screen work
without replacing the faster smoke scripts.

Acceptance criteria:

- Given browser automation is available, when the browser e2e runs, then it clicks through the
  Keycloak authorization-code-with-PKCE login for the local demo user.
- Given login succeeds, then the browser reaches the game UI, authenticated API calls include bearer
  tokens, and the UI indicates Keycloak identity mode.
- Given a gameplay smoke is run in browser, then it validates the main screen can show wallet,
  round phase, bet/cashout controls, history, verification, and WebSocket status.
- Given the full PKCE click-through is flaky or unavailable in the local environment, then the
  artifact may keep a documented manual PKCE checklist and retain token/API smoke as the required
  fast validation path.
- Given browser validation runs at desktop and mobile widths, then visible controls and game status
  do not overlap incoherently.

### Story 5: Operator sees concise lifecycle signals

As an operator or evaluator reading logs, I want concise lifecycle and integration messages so I can
understand whether the stack is behaving correctly.

Acceptance criteria:

- Given Game starts, then logs identify persistence adapter, wallet-effect adapter, auth mode,
  migration dependency assumption, and restart reconciliation summary.
- Given a round opens, starts, crashes, and settles, then logs include round id, phase transition,
  crash multiplier basis points where safe to reveal, bet counts, settlement count, and duration
  fields.
- Given a bet debit or payout credit is requested, consumed, accepted, rejected, duplicated, or
  timed out, then Game and Wallet logs include event type, idempotency key, player id or safe
  correlation id, round id, bet id, amount cents, and result.
- Given RabbitMQ publishes or consumes a wallet message, then logs identify routing key, direction,
  idempotency key, and accepted/rejected/duplicate status without dumping secrets or full tokens.
- Given migrations run, then migration startup and successful no-op/latest states are visible in
  logs.
- Given auth mode is Keycloak or dev, then startup and request rejection logs make the active mode
  clear without logging bearer tokens.

### Story 6: Documentation is copy-paste friendly

As an evaluator on Windows or Unix-like shells, I want README and handoff commands that I can paste
directly into my terminal.

Acceptance criteria:

- Given a reviewer uses Windows PowerShell, then README/handoff include valid PowerShell examples
  for demo startup, health checks, logs, tests, smoke scripts, and environment overrides where
  syntax differs.
- Given a reviewer uses Bash, then README/handoff include equivalent Bash examples where syntax
  differs.
- Given Keycloak takes longer to become healthy on first boot, then docs state the expected warmup
  behavior and how to retry or inspect logs.
- Given Docker Desktop or Compose is not ready, then docs include the shortest useful diagnostic
  commands.
- Given a reviewer wants the critical validation list, then docs separate fast smoke, browser
  smoke, service tests, frontend tests, and full Docker validation.
- Given the feature is implemented, then `docs/handoff.md`, `docs/roadmap.md`, and
  `docs/next-spec-prompt.md` are updated with status, validation, remaining optional polish, and
  the next recommended Spec Kit prompt.

## Functional Requirements

- **FR-001**: The project must provide one documented evaluator command that starts or verifies the
  local Docker stack, waits for required services, verifies Game and Wallet health through direct
  ports and Kong, and prints demo URLs and test credentials.
- **FR-002**: The evaluator command must surface migration status for both Game and Wallet,
  including successful first-run and already-latest/no-op outcomes.
- **FR-003**: The evaluator command must fail clearly with a non-zero exit code when Docker,
  migrations, health checks, Kong routing, Keycloak token acquisition, or frontend reachability
  fails.
- **FR-004**: The project must provide a deterministic smoke script that covers wallet seed/read,
  bet acceptance after wallet debit confirmation, cashout or deterministic crash, wallet balance
  assertion, round history, player bet history where applicable, and provably fair verification.
- **FR-005**: The deterministic smoke script must avoid reliance on natural crash luck by using a
  documented deterministic demo/test mechanism.
- **FR-006**: Deterministic demo/test mechanisms must not change public money/game rules, must not
  expose arbitrary public wallet credit/debit REST APIs, and must be clearly separated from normal
  player-facing runtime behavior.
- **FR-007**: Fast API/token-based smoke must remain available and documented independently from
  browser e2e.
- **FR-008**: Browser e2e may be added for Keycloak PKCE click-through if it remains reliable and
  small; if not, the feature must provide a manual PKCE checklist and explain the limitation.
- **FR-009**: Browser validation must not replace service/API tests for money, wallet, RabbitMQ,
  persistence, or verification correctness.
- **FR-010**: Game logs must include concise structured or consistently formatted lifecycle events
  for startup mode, reconciliation, betting opened, round started, crash, settlement, and next-round
  creation.
- **FR-011**: Wallet logs must include concise structured or consistently formatted lifecycle
  events for wallet creation/read when relevant, seed credit, debit, payout credit, rejection,
  duplicate idempotency handling, and non-negative balance protection.
- **FR-012**: RabbitMQ publish/consume logs must identify routing key, direction, correlation or
  idempotency key, and result without logging secrets.
- **FR-013**: Auth logs and startup output must identify Keycloak vs dev auth mode without logging
  bearer tokens, refresh tokens, secrets, or full private credential material.
- **FR-014**: Migration startup logs must make it easy to distinguish migration applied,
  already-latest, and failed states.
- **FR-015**: README and handoff docs must provide copy-paste command examples for Windows
  PowerShell and Bash where syntax differs.
- **FR-016**: Docs must call out expected Keycloak first-start timing, retry behavior, and useful
  diagnostic logs.
- **FR-017**: Existing public REST route shapes must remain compatible:
  `GET /games/rounds/current`, `GET /games/rounds/history`,
  `GET /games/rounds/:roundId/verify`, `GET /games/bets/me`, `POST /games/bet`,
  `POST /games/bet/cashout`, `POST /wallets`, and `GET /wallets/me`.
- **FR-018**: Existing RabbitMQ wallet-effect contracts must remain compatible and idempotent.
- **FR-019**: Existing WebSocket projection events must remain server-to-client synchronization
  only; player actions must remain REST.
- **FR-020**: Domain code must remain free of NestJS, MikroORM, RabbitMQ, Socket.IO, controllers,
  DTOs, browser automation, demo scripts, and logging-framework-specific concerns.
- **FR-021**: Money amounts must remain integer cents, multipliers must remain basis points, and no
  feature in this slice may alter bet/cashout payout math.
- **FR-022**: Optional product polish such as auto-cashout, leaderboard, or richer history may be
  documented as future candidates only after deterministic evaluator confidence remains intact.

## Key Concepts

- **Evaluator Demo Command**: A top-level documented command or script that orchestrates startup,
  health verification, migration visibility, and local demo instructions.
- **Deterministic Smoke Scenario**: A repeatable scripted path that controls or selects a known
  outcome without changing public gameplay rules, then asserts wallet, bet, history, and
  verification behavior.
- **Fast API Smoke**: A token/API validation path optimized for quick local checks and CI-like
  feedback, independent of browser automation.
- **Browser PKCE Smoke**: Optional browser automation or a manual checklist that proves Keycloak
  login and authenticated game UI behavior.
- **Lifecycle Logs**: Structured or consistently formatted log messages that explain key service,
  round, wallet, RabbitMQ, migration, and auth transitions without requiring a debugger.
- **Operator Runbook**: README/handoff documentation with shell-specific commands, expected output,
  warmup notes, and diagnostics.

## Edge Cases

- Docker is installed but Docker Desktop or the Linux engine is not running.
- Keycloak imports the realm but takes longer than the other services to report healthy.
- Migrations have already run and should report already-latest/no-op without being treated as a
  failure.
- Kong is running but an upstream service is unavailable.
- RabbitMQ is reachable but a queue binding or routing key is misconfigured.
- The smoke script is re-run for the same demo user after a previous partial failure.
- The deterministic smoke setup prepares a round that is no longer current by the time the bet is
  submitted.
- The browser PKCE flow opens a login session that already has cookies from a previous run.
- Browser automation is unavailable in the evaluator environment, but API smoke can still run.
- Logs include enough correlation data for debugging but must not expose bearer tokens, client
  secrets, server seeds before reveal, or private Keycloak material.
- PowerShell and Bash examples require different environment-variable syntax.

## Non-Goals

- Changing core bet/cashout payout math.
- Changing crash multiplier calculation, `houseEdgeBps = 100`, SHA-256 seed commitment, or
  HMAC-SHA256 verification semantics except for deterministic demo/test setup that preserves
  normal rules.
- Adding public arbitrary wallet credit/debit REST APIs.
- Replacing PostgreSQL, MikroORM, RabbitMQ, Kong, Keycloak, Docker Compose, Vite React, TanStack
  Query, or Zustand.
- Introducing Prometheus, Grafana, OpenTelemetry collectors, log aggregation services, or other
  heavy monitoring infrastructure.
- Cloud deployment.
- Cosmetic-only redesign unrelated to evaluator confidence, responsive usability, or documented
  demo flow.
- Auto-cashout as required scope.
- Leaderboard or richer history as required scope.
- Transactional outbox/inbox unless a later plan proves it is needed for correctness beyond the
  completed hardening guarantees.
- Admin/operator back office.

## Success Criteria

- A fresh evaluator can run one documented command, wait for health, and receive working demo URLs
  and credentials.
- A deterministic smoke script proves wallet seed, bet, cashout or crash, history, and provably
  fair verification without relying on lucky crash timing.
- Fast API/token smoke remains easy to run and gives a concise pass/fail summary.
- Optional browser validation either covers Keycloak PKCE click-through or provides a clear manual
  checklist while preserving the fast smoke path.
- Logs make round lifecycle, wallet operations, RabbitMQ flow, migration startup, and auth mode
  understandable from Compose/service output.
- README and handoff docs are copy-paste friendly for PowerShell and Bash where commands differ,
  including Keycloak startup timing notes.
- Existing money, game, auth, persistence, RabbitMQ, WebSocket, and DDD boundary guarantees remain
  intact.

## Assumptions

- The completed `002-persistence-auth-e2e-hardening` implementation is the baseline for this spec.
- The local challenge delivery target remains Docker Compose, not cloud deployment.
- Demo/test determinism can be achieved with a small scriptable mechanism without changing public
  gameplay semantics.
- The Keycloak demo user remains `player` / `player123` unless a later plan intentionally changes
  seeded realm credentials and updates docs.
- Observability value comes primarily from clear logs and scripts, not from adding infrastructure.

# Implementation Plan: Challenge Polish and Operational Confidence

**Spec**: `specs/003-challenge-polish-operational-confidence/spec.md`  
**Branch**: `003-challenge-polish-operational-confidence`  
**Date**: 2026-06-21  
**Status**: Planned for `/speckit-tasks`

## Summary

Add evaluator-friendly operational polish around the completed durable gameplay foundation. The
work should make the local challenge stack easier to start, validate, observe, and explain without
changing public gameplay contracts, wallet correctness, crash math, or DDD boundaries.

The plan is additive and intentionally small: root scripts wrap Docker Compose and smoke checks;
demo-only deterministic hooks make the gameplay smoke repeatable; existing services emit concise
lifecycle logs; optional browser validation covers Keycloak PKCE when it stays reliable; docs become
copy-paste friendly for PowerShell and Bash.

## Technical Context

- Runtime and package scripts: root npm workspace scripts plus Bun service commands.
- Local delivery: Docker Compose with PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets, and
  Frontend.
- Backend: NestJS services with existing application ports, MikroORM repositories, RabbitMQ
  adapters, and Keycloak guards.
- Frontend: Vite React game UI with existing Keycloak/dev identity handling.
- Browser tooling: optional lightweight Playwright-style smoke; fast API smoke remains required.
- Documentation: README plus `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

## Architecture Goals

- Preserve server authority for round state, crash point, accepted bets, cashout, settlement,
  wallet balance, history, and verification.
- Keep public REST routes, RabbitMQ events, WebSocket projection, and auth contracts compatible.
- Keep deterministic demo controls outside normal player-facing runtime and outside domain code.
- Keep observability to concise service logs and script output; do not add monitoring
  infrastructure.
- Keep all new scripts transparent and debuggable, with non-zero exits on failed health/smoke
  checks.

## Implementation Strategy

### 1. Root Script Entry Points

Add root package scripts that evaluators can discover quickly:

- `demo:up`: starts or verifies the Compose stack, waits for migrations and health, checks frontend
  reachability, and prints URLs plus local credentials.
- `smoke:api`: runs the deterministic token/API smoke against the normal Docker/local
  Keycloak/RabbitMQ/PostgreSQL profile.
- `smoke:browser`: optional browser PKCE smoke, added only if the implementation stays lightweight
  and reliable.
- Keep existing `docker:up`, `docker:down`, and `docker:prune` scripts available.

Prefer adding reusable scripts under a new `scripts/` folder rather than hiding large command
chains inside `package.json`. Use Node or shell scripts only where they reduce cross-platform
fragility; document PowerShell and Bash invocations where they differ.

### 2. Demo Startup Orchestrator

Implement `demo:up` as a transparent wrapper around existing Compose behavior:

- Verify Docker/Compose availability and report when Docker Desktop or the Linux engine is not
  ready.
- Start the stack with Compose or verify running services.
- Wait for `games-migrations` and `wallets-migrations` success or already-latest behavior through
  Compose/service status and logs.
- Poll direct health endpoints and Kong health routes.
- Poll frontend reachability.
- Account for Keycloak first-start warmup with clear progress output and retry guidance.
- Print:
  - Frontend URL.
  - Kong base URL.
  - Games and Wallets Swagger URLs.
  - Keycloak URL.
  - Direct and Kong health URLs.
  - Demo user, password, realm, and client.
  - Suggested next commands: `npm run smoke:api`, optional `npm run smoke:browser`, selected log
    commands.

The script should fail fast for missing prerequisites, but wait patiently for normal service warmup.

### 3. Deterministic API Smoke

Implement `smoke:api` as the required fast validation path:

- Acquire a real Keycloak token for the local demo user.
- Create/read the Wallet through public Wallet routes.
- Use the approved seed/bootstrap behavior and verify `seed_credit` idempotency.
- Prepare or select a deterministic round without relying on natural crash luck.
- Place a bet through Kong and verify it is accepted only after Wallet debit confirmation.
- Cash out at a known safe multiplier or intentionally validate the lost-bet crash path.
- Verify wallet balance in integer cents, bet status, round history, player bet history where
  useful, and provably fair verification recomputation.
- Print a compact pass summary with player id, round id, bet id, starting balance, final balance,
  cashout/crash result, and verification result.

The preferred deterministic approach is a demo/test-only next-round seed or application harness that
still uses the normal SHA-256 seed commitment and HMAC-SHA256 crash derivation. If implementation
finds this too invasive, use an internal script-only harness against application services or an
explicit dev/smoke mode, but do not add public crash-control or arbitrary wallet mutation APIs.

### 4. Demo-Only Determinism Boundary

If a service-side deterministic seed hook is needed:

- Gate it behind explicit local demo/test configuration, for example `DEMO_DETERMINISTIC_ROUNDS` or
  an equivalent narrowly named flag.
- Keep the hook in application/infrastructure/configuration code, not in domain invariants.
- Preserve the normal provably fair formula and recorded verification metadata.
- Ensure normal Docker/local player mode remains unchanged unless the smoke command intentionally
  enables the demo/test flag.
- Add focused tests proving the hook chooses a known crash multiplier while verification still
  recomputes that multiplier from the revealed seed/nonce.

Avoid database schema changes unless a small persisted flag or seed source is proven necessary.

### 5. Lifecycle and Integration Logs

Add concise logs through the existing NestJS logging path:

- Game startup: persistence adapter, wallet-effect adapter, auth mode, migration dependency
  assumption, reconciliation summary.
- Round lifecycle: betting opened, round started, crash, settlement, next-round creation.
- Game wallet effects: debit request, payout request, accepted/rejected result, duplicate result,
  timeout.
- Wallet operations: wallet creation/read when useful, seed credit, debit, payout credit,
  rejection, duplicate idempotency outcome.
- RabbitMQ: routing key, direction, idempotency key, correlation fields, result.
- Auth: active mode and request rejection reasons without tokens.

Use stable single-line fields. A small helper such as `formatLogEvent(eventName, fields)` is
acceptable if it reduces inconsistency. Do not introduce log aggregation, metrics services, or
OpenTelemetry for this feature.

### 6. Optional Browser PKCE Smoke

Try the lightest reliable browser path:

- Use existing local Keycloak realm and `player` / `player123`.
- Automate real PKCE click-through only if it works reliably with lightweight Playwright-style
  tooling.
- Validate the authenticated game screen shows Keycloak identity, wallet, round phase, controls,
  history, verification, and WebSocket status.
- Capture desktop and mobile screenshots in `output/playwright/` when useful.
- If automation is flaky due to Keycloak timing or local browser tooling, document a manual PKCE
  checklist instead and keep `smoke:api` as the required smoke command.

Do not build a broad custom browser test harness in this slice.

### 7. Operator Documentation

Update docs with a small runbook shape:

- Quick demo startup.
- Fast smoke.
- Optional browser smoke/manual checklist.
- Service tests and frontend tests.
- Full validation commands.
- PowerShell and Bash examples where syntax differs.
- Known Keycloak warmup timing and log commands.
- Docker Desktop/Compose diagnostics.
- What successful smoke output looks like.

Keep docs focused on evaluator confidence, not a full operations manual.

### 8. Documentation and Spec Closeout

Implementation must update:

- `README.md`: root demo/smoke commands, URLs, credentials, health checks, PowerShell/Bash examples,
  Keycloak warmup notes, and validation matrix.
- `docs/architecture.md`: demo/test determinism boundary and lifecycle log posture if they affect
  runtime behavior.
- `docs/architecture-decisions.md`: add an ADR only if the deterministic hook or log strategy
  introduces a meaningful trade-off.
- `docs/handoff.md`: status, validation run, blocked checks, residual manual smoke.
- `docs/roadmap.md`: Phase 4 polish progress and remaining bonus candidates.
- `docs/next-spec-prompt.md`: next useful Spec Kit prompt after this polish slice.

## Data Model Plan

See `data-model.md` for script inputs/outputs, demo-only configuration, and log event field shapes.

No new domain entities are planned. No database migration is planned by default.

## Contract Plan

See `contracts.md` for script, environment/config, log, REST, RabbitMQ, WebSocket, and browser smoke
contracts.

Public REST, RabbitMQ, WebSocket, and auth contracts should remain compatible. Any new demo/test
hook must be explicitly non-public and disabled outside local demo/test use.

## Validation Plan

Required validation before closeout:

- `npm run demo:up`
- `npm run smoke:api`
- `docker compose config --quiet`
- Direct health checks for Games and Wallets.
- Kong health checks for Games and Wallets.
- Keycloak token acquisition for `player` / `player123`.
- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `docker compose run --rm games bun test tests/unit`
- `docker compose run --rm games bun test tests/e2e`
- `docker compose run --rm wallets bun test tests/unit`
- `docker compose run --rm wallets bun test tests/e2e`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- Domain boundary search for forbidden infrastructure/framework/demo imports in domain folders.
- Money arithmetic search confirming cents-only money behavior remains intact.

Optional validation:

- `npm run smoke:browser` if implemented.
- Manual PKCE checklist if browser automation is not implemented or is unreliable in the local
  environment.
- Desktop and mobile screenshots under `output/playwright/` when browser validation runs.

If Docker Desktop, browser tooling, or Keycloak warmup blocks validation, closeout must state the
exact failed command, observed failure, and the remaining local verification step.

## Risks and Mitigations

- **Demo determinism could leak into product behavior**: gate deterministic seed/harness code behind
  explicit local demo/test config, keep it out of domain rules, and document the boundary.
- **Smoke scripts could become brittle orchestration**: keep scripts small, use health polling and
  direct assertions, and print failed step details.
- **Browser PKCE automation can be flaky**: keep it optional, use API smoke as the required path,
  and document a manual checklist if automation is not robust.
- **Logs could expose secrets**: define allowed log fields and forbid bearer tokens, refresh tokens,
  client secrets, and unrevealed server seeds.
- **Docs could become long and hard to scan**: separate quick start, smoke, validation, and
  troubleshooting sections with shell-specific examples only where needed.
- **Root scripts could conflict with Bun/npm expectations**: keep root npm scripts as the public
  evaluator entry points while preserving existing Bun service commands.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review.
2. Root scripts and `scripts/` folder scaffolding.
3. Demo startup health/migration/URL printer.
4. Deterministic API smoke and demo/test seed boundary.
5. Service tests for deterministic verification and idempotent smoke setup.
6. Lifecycle log helper and Game/Wallet/RabbitMQ/auth log placement.
7. Optional browser PKCE smoke or manual checklist.
8. Validation command updates.
9. README and docs runbook updates.
10. Handoff, roadmap, next-spec prompt closeout.

Avoid tasks for auto-cashout, leaderboard, sound effects, final artwork, cloud deployment,
transactional outbox/inbox, or monitoring infrastructure.

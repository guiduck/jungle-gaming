# Implementation Plan: Persistence, Auth, and E2E Hardening

**Spec**: `specs/002-persistence-auth-e2e-hardening/spec.md`  
**Branch**: `002-persistence-auth-e2e-hardening`  
**Date**: 2026-06-20  
**Status**: Planned for `/speckit-tasks`

## Summary

Harden the gameplay foundation by making PostgreSQL/MikroORM the active runtime persistence layer,
making RabbitMQ the default wallet-effect boundary, making Keycloak login the normal player path,
and adding automated e2e coverage around money and game correctness.

The plan intentionally avoids a large rewrite. Existing domain entities, application ports,
controllers, WebSocket gateway, RabbitMQ adapters, and MikroORM artifacts are the starting point.
The work is mostly completion and wiring: finish concrete repositories, add migration automation,
switch providers by explicit runtime mode, tighten auth UX, and prove the critical paths with tests.

## Technical Context

- Runtime: Bun workspaces.
- Backend: NestJS services in `services/games` and `services/wallets`.
- Persistence: PostgreSQL 18+ with MikroORM.
- Messaging: RabbitMQ request/result events between Game and Wallet.
- Gateway: Kong routes for public API access.
- Identity: Keycloak OIDC authorization code with PKCE for browser login; JWT `sub` becomes
  `PlayerId`.
- Frontend: Vite React, TanStack Query, Zustand, Socket.IO client.
- Local delivery: Docker Compose from tracked files.

## Architecture Goals

- Preserve DDD boundaries. Domain code must remain free of NestJS, MikroORM, RabbitMQ, WebSocket,
  controllers, and DTOs.
- Keep application services dependent on ports. Infrastructure adapters implement those ports.
- Use PostgreSQL-backed repositories in Docker/local challenge mode.
- Keep in-memory repositories, local `x-player-id`, and internal Wallet HTTP effects only for
  explicit dev/smoke mode.
- Keep RabbitMQ choreography direct and legible. Do not introduce a saga framework or generalized
  outbox/inbox for this feature.
- Keep browser/auth validation useful but small. Avoid a large custom auth test harness.

## Implementation Strategy

### 1. Runtime Modes and Configuration

Add explicit configuration flags for runtime provider selection:

- `PERSISTENCE_ADAPTER=postgres|memory`
- `WALLET_EFFECT_ADAPTER=rabbitmq|internal-http|immediate`
- `AUTH_MODE=keycloak|dev`

Docker/local challenge defaults:

- `PERSISTENCE_ADAPTER=postgres`
- `WALLET_EFFECT_ADAPTER=rabbitmq`
- `AUTH_MODE=keycloak`

Unit tests and explicit smoke may opt into memory/dev adapters. If the config is absent in Docker,
prefer the production-like defaults and fail clearly when required connection settings are missing.

### 2. Game Persistence

Complete `MikroOrmRoundRepository` so it satisfies the existing `RoundRepository` port:

- `getCurrent()`: load the current non-settled round, or create/persist a new betting round when no
  active round exists.
- `saveCurrent(round)`: upsert the round and its bets transactionally.
- `createNext()`: create and persist the next betting round with provably fair seed commitment.
- `addCompleted(round)`: persist reveal/verification data and completed timestamps.
- `getHistory(limit)`: return completed rounds in newest-first order.
- `getCompleted(roundId)`: return completed verification data only when reveal data is available.
- `getPlayerRoundSnapshots(playerId, limit)`: query bets by player and include the owning round
  snapshot fields needed by the existing API.

The repository should map between domain objects and MikroORM entities inside infrastructure only.
If the current entity shape cannot faithfully represent required restart/reconciliation data, adjust
MikroORM schema/migration artifacts without moving ORM types into domain code.

### 3. Game Restart Reconciliation

Add a small startup reconciliation path in the Game application layer or runner:

- Load active rounds from PostgreSQL on startup.
- Preserve accepted bets and wallet-effect records.
- If a `betting` round is active, it may resume or be cleanly superseded by a new betting round
  after preserving the previous record.
- If a `running` round is active and the exact timer cannot be resumed faithfully, move it to a
  documented terminal/reconciled state that does not erase participation, then open a new betting
  round.
- If a `crashed` round is unsettled, finish idempotent settlement through RabbitMQ where needed.

The simplest acceptable approach is to keep the domain lifecycle unchanged and represent interrupted
active rounds as crashed/settled with an auditable timestamp and preserved bets, as long as tests
prove history and wallet effects remain explainable. If implementation discovers the domain needs
an explicit `reconciled` terminal status, that change must be documented because it affects
lifecycle contracts.

### 4. Wallet Persistence

Add concrete MikroORM implementations for Wallet ports:

- `WalletRepository.findByPlayerId(playerId)`.
- `WalletRepository.save(wallet)` with balance/version persistence.
- `WalletOperationRepository.record(operation)` with duplicate-safe behavior by idempotency key.

The idempotency behavior should be database-backed. Duplicate `seed_credit`, `debit_bet`, and
`credit_payout` operations with the same idempotency key must return the already-recorded outcome
without reapplying balance changes.

If the current `WalletOperationRepository` port is too small to return existing duplicate outcomes,
extend the application port minimally and update in-memory adapters/tests to match. Keep the change
inside application/infrastructure boundaries.

### 5. RabbitMQ Default Wallet Effects

Switch the Docker/local Game `GAME_WALLET_GATEWAY` provider to the RabbitMQ gateway by default.
Keep `HttpGameWalletGateway` and immediate/no-op variants available only through explicit dev/smoke
configuration.

Required behavior:

- Bet request validates Game constraints first.
- Game publishes `wallet.bet_debit_requested` with a stable idempotency key.
- Wallet consumes, idempotently records the operation, mutates balance only when accepted, and
  publishes accepted/rejected result.
- Game accepts the bet only after an accepted result.
- Timeout returns a retryable wallet-confirmation state and does not create an accepted bet.
- Payout credit follows the same idempotent request/result pattern.

Use the existing `game_message_receipts` and wallet operation ledger before adding more tables.
Only add schema if a real retry/reconciliation gap requires it.

### 6. Migration Automation

Add automatic migration execution to the Docker/local setup while preserving manual MikroORM
commands for learning and troubleshooting.

Preferred KISS path:

- Add migration scripts to each service package, for example `migration:up`.
- Add one-shot Compose services such as `games-migrations` and `wallets-migrations` that depend on
  healthy PostgreSQL and run the service migration commands.
- Make `games` depend on `games-migrations` completing successfully and `wallets` depend on
  `wallets-migrations` completing successfully.

This keeps migrations explicit, repeatable, and visible in Compose logs without hiding schema work
inside application boot. It also avoids services starting against missing tables.

Manual commands remain documented:

```bash
cd services/games && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
cd services/wallets && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
```

Docs must explain that `migration:up` applies pending migration files and records them so later
runs are no-ops.

### 7. Keycloak Primary Auth UX

Make normal frontend startup use Keycloak login:

- If unauthenticated and `AUTH_MODE=keycloak`, route users through Keycloak OIDC PKCE.
- Attach bearer tokens to Game and Wallet requests.
- Display a small identity indicator that distinguishes Keycloak identity from explicit dev
  identity.
- Keep dev identity controls only when `AUTH_MODE=dev` or an equivalent explicit frontend env flag
  is enabled.

Backend guards should derive `PlayerId` from JWT `sub` in Keycloak mode. Dev `x-player-id` fallback
must be intentionally enabled, visible in UI, and unavailable as a silent fallback in normal mode.

React changes should stay localized to auth helpers, API client, and existing game shell surfaces.
Do not redesign the game UI as part of this feature.

### 8. API and E2E Test Strategy

Add focused e2e tests instead of a broad framework:

- Service-level e2e tests for Game and Wallet using real application modules and test-controlled
  config.
- Persistence tests against PostgreSQL where practical. If local CI constraints make Docker-managed
  DB expensive, keep tests runnable against the Compose stack and document prerequisites.
- RabbitMQ tests against the Compose RabbitMQ or a test-controlled broker profile.
- Auth tests use deterministic Keycloak realm/token setup where practical. Browser validation must
  cover real login; API e2e can avoid a large login harness if token acquisition is deterministic.

Critical e2e coverage:

- Bet accepted after wallet confirmation.
- Timeout/retry without accepted bet.
- Insufficient balance.
- Duplicate bet.
- Invalid phase.
- Invalid amount.
- Cashout accepted before crash.
- Cashout rejected after crash.
- Seeded wallet balance through `seed_credit`.
- Verification metadata recomputes recorded crash.
- Duplicate RabbitMQ wallet messages do not duplicate debit or payout.
- Game and Wallet restart persistence for selected happy-path state.

### 9. Browser Validation

Use the lightest reliable browser validation path:

- Real Keycloak login in browser.
- Two browser clients connected to the same stack.
- Both clients converge on the same server-authoritative round phase, accepted bets,
  cashout/crash result, wallet effects, and history.
- Reconnect path refetches snapshots and corrects local Zustand projection.
- Desktop and mobile widths are checked for usable layout and no incoherent overlap.

Automation is preferred for two-client convergence if the harness stays small. If full automation
would create outsized test code, add a documented manual browser script with exact steps and
expected observations, plus screenshots or notes in closeout.

### 10. Documentation and Operational Closeout

Implementation must update:

- `README.md`: migration tutorial, Docker startup, auth modes, e2e commands, known limitations.
- `docs/architecture.md`: final runtime provider defaults and migration setup.
- `docs/domain-model.md`: any lifecycle/idempotency refinements discovered during restart handling.
- `docs/architecture-decisions.md`: migration automation, RabbitMQ default, and active-round
  restart reconciliation trade-offs.
- `docs/handoff.md`: status, validation, residual risk.
- `docs/roadmap.md`: Phase 3.5 progress and gate status.
- `docs/next-spec-prompt.md`: next useful Spec Kit prompt after hardening.

## Data Model Plan

See `data-model.md` for entity and schema expectations.

Minimum persistence outcomes:

- Game DB stores active/completed rounds, bets, verification data, and message receipts.
- Wallet DB stores wallets and operation ledger entries.
- Idempotency constraints are database-backed.
- Restart behavior can be verified from persisted state.

## Contract Plan

See `contracts.md` for REST, RabbitMQ, WebSocket, and auth contract expectations.

No public route shape changes are planned. Any DTO changes should be additive and compatible with
the existing frontend where possible.

## Validation Plan

Required validation before closeout:

- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `cd services/games && bun test tests/unit`
- `cd services/wallets && bun test tests/unit`
- `cd services/games && bun test tests/e2e`
- `cd services/wallets && bun test tests/e2e`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- `docker compose config`
- `bun run docker:up` or equivalent Compose startup with migration services
- Direct and Kong health checks
- Manual or automated two-client browser validation
- Domain boundary search for forbidden imports
- Money arithmetic search confirming cents-only money behavior

If Docker Desktop or broker/database availability blocks validation, closeout must state exactly
which checks could not run and what remains for local verification.

## Risks and Mitigations

- **Repository placeholders hide missing behavior**: complete repository methods before switching
  providers, and add e2e restart tests.
- **Automatic migrations can obscure failures**: use explicit one-shot migration services with
  visible logs and health/dependency ordering.
- **Running-round restart semantics can be unfair if guessed**: preserve records and use an
  explainable reconciliation path when exact timer resume is not reliable.
- **RabbitMQ request/result can become overbuilt**: keep current event choreography and idempotency
  tables unless tests prove a missing case.
- **Auth e2e can sprawl**: use deterministic realm/token setup for API tests and reserve full real
  login for browser validation.
- **UI work can drift into polish**: only touch auth identity indication, dev-mode visibility,
  reconnect/convergence behavior, and responsive validation issues found by the hardening checks.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review.
2. Config/runtime mode definitions.
3. Migration scripts and Compose automation.
4. Game MikroORM repository completion.
5. Wallet MikroORM repositories and ledger idempotency.
6. Provider wiring for postgres/RabbitMQ defaults.
7. Restart reconciliation.
8. Keycloak-primary frontend/backend auth tightening.
9. API/RabbitMQ/persistence e2e tests.
10. Browser/two-client/mobile validation.
11. Full validation commands.
12. Documentation closeout.

Avoid generating bonus tasks for auto cashout, observability, leaderboard, final art, or
multi-instance scheduler work.

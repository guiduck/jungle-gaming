# Implementation Plan: Gameplay Foundation

**Spec**: `specs/001-gameplay-foundation/spec.md`  
**Branch**: `001-gameplay-foundation`  
**Date**: 2026-06-19  
**Status**: Updated plan for active `/speckit-implement`

## Summary

Implement the crash-game MVP on the imported scaffold with the simplest correct design: NestJS
services for Game and Wallet, MikroORM persistence, RabbitMQ for wallet effects, Kong/Keycloak for
local delivery, and a Vite React frontend that renders the server-authoritative round state as a
goat climbing a mountain.

Clarified defaults:

- Bet acceptance is reserve/debit-first; Game confirms a bet only after Wallet confirms the wallet
  effect.
- Cashout truth is server-authoritative; UI feedback can be smooth/pending but must reconcile to
  accepted or rejected server results.
- Provably fair uses SHA-256 seed commitments, HMAC-SHA256 crash derivation, and `houseEdgeBps =
  100` for the MVP.
- `POST /games/bet` waits for a short, documented RabbitMQ wallet result timeout. Timeout returns a
  clear retryable wallet-confirmation state, and the bet is not accepted until an accepted wallet
  result is recorded.
- Local test-player funding uses a bootstrap/seed path that records a `seed_credit` wallet
  operation; public wallet credit/debit REST endpoints remain out of scope.
- WebSocket uses NestJS WebSockets with the simplest Socket.IO-compatible adapter unless a smaller
  `ws` path proves materially simpler during implementation.
- KISS is mandatory: avoid speculative abstractions and bonus infrastructure until the MVP passes.

## Technical Context

- Runtime: Bun workspaces.
- Backend: NestJS services in `services/games` and `services/wallets`.
- Persistence: PostgreSQL databases `games` and `wallets` with MikroORM.
- Messaging: RabbitMQ through simple topic/queue adapters.
- API gateway: Kong routes already configured for `/games/*` and `/wallets/*`.
- Auth: Keycloak JWT validation in backend guards; frontend uses OIDC authorization code with PKCE.
- WebSocket: NestJS WebSockets for server-to-client game projection, defaulting to Socket.IO for
  the Docker MVP unless implementation findings favor `ws`.
- Frontend: scaffold Vite + React in `frontend/`, Tailwind CSS v4, shadcn/ui, TanStack Query,
  Zustand.

## Architecture Plan

### Shared Packages

Create a small shared package only for cross-service contracts and primitives that genuinely need
to be shared:

- event names and event payload types
- stable IDs and date/string helpers if needed
- money serialization helpers that do not contain domain behavior

Do not put Game or Wallet domain entities in shared packages.

### Game Service

Keep DDD layers explicit:

- `domain/`: `Round`, `Bet`, `Money`, `CrashPoint`, `PlayerId`, round status, bet status, domain
  errors, and provably fair calculator.
- `application/`: use cases for current round, history, place bet, cashout, verify round, round
  lifecycle ticking, and settlement reaction. Define repository and event publisher ports here.
- `infrastructure/`: MikroORM entities/repositories, RabbitMQ publisher/consumer adapters,
  scheduler/timer adapter, Keycloak JWT adapter if service-local, and config.
- `presentation/`: REST controllers for the official route shape, DTOs, guards, Swagger, and
  WebSocket gateway.

Use a single active round lifecycle runner for MVP. It can be a simple in-process scheduler/timer
started by the Game Service. Avoid distributed leader election until there is a real multi-instance
requirement.

### Wallet Service

Keep the Wallet service authoritative for balance:

- `domain/`: `Wallet`, `Money`, wallet operation/idempotency identity, and domain errors.
- `application/`: create/get wallet, reserve/debit bet amount, credit payout, reject insufficient
  balance, and idempotent message handling use cases.
- `infrastructure/`: MikroORM wallet repository and operation ledger, RabbitMQ consumer/publisher,
  Keycloak JWT adapter if service-local, and config.
- `presentation/`: `POST /wallets`, `GET /wallets/me`, DTOs, guards, Swagger.

Use an operation ledger table keyed by idempotency key to prevent duplicate debits/credits on
RabbitMQ redelivery.

### RabbitMQ Flow

Use direct, readable event choreography:

1. Game receives `POST /games/bet`.
2. Game validates round phase and duplicate bet locally.
3. Game publishes wallet reserve/debit request with idempotency key.
4. Wallet consumes request, checks balance, records operation, debits/reserves amount, and publishes
   accepted/rejected result.
5. Game accepts the bet only after the accepted result; rejected result returns/propagates a clear
   failure to the user.
6. On crash, Game marks pending bets lost and publishes payout credit requests for cashed-out bets.
7. Wallet idempotently credits payouts and publishes settlement results.
8. Game marks round settled when required settlement results are complete or no credits are needed.

For MVP simplicity, the HTTP bet request waits for the Wallet response with a short documented
timeout while still using RabbitMQ as the service boundary. Timeout returns a clear retryable
wallet-confirmation state. The Game Service must not mark the bet accepted until an accepted wallet
result is recorded, so user retry and later reconciliation cannot create duplicate accepted bets.

### REST and WebSocket

Preserve official route shape:

- Game: `GET /games/rounds/current`, `GET /games/rounds/history`,
  `GET /games/rounds/:roundId/verify`, `GET /games/bets/me`, `POST /games/bet`,
  `POST /games/bet/cashout`.
- Wallet: `POST /wallets`, `GET /wallets/me`.

WebSocket is server-to-client push only. Use NestJS WebSockets for round state, multiplier sync,
bet/cashout updates, crash, settlement, and history refresh. REST remains the path for player
commands.

### Provably Fair

Use a simple deterministic design:

- Generate a server seed chain.
- Before each round, expose the SHA-256 hash commitment for the round seed.
- Derive crash point with HMAC-SHA256 using the round seed and a round nonce/id.
- Apply `houseEdgeBps = 100`.
- After crash, reveal the seed/nonce inputs needed to independently recompute the crash point.

Keep the formula small, documented, and covered by deterministic tests. Verification responses must
include enough formula metadata for players to recompute the recorded basis-point multiplier. Do not
add a complex cryptographic framework.

### Frontend

Scaffold `frontend/` as Vite React.

- TanStack Query owns wallet, current round snapshot, histories, and verification data.
- Zustand owns hot projected game state: phase, displayed multiplier, countdown, visible bets,
  cashout pending/accepted/rejected feedback, WebSocket connection status, and goat animation flags.
- Use WebSocket events to update the store; refetch snapshots on reconnect or suspected event gaps.
- Keep components composed by screen areas: game scene, bet controls, wallet/player bar, current
  bets, round history, verification panel, toast/error surface.
- The game screen is the first screen after login; no landing page.

For cashout latency, show a pending state immediately after the click, keep the animation smooth,
and then reconcile visibly to accepted or rejected server truth.

## Data Model Plan

See `data-model.md` for entity-level details. Minimum persisted data:

- Game DB: rounds, bets, provably fair seed/commitment data, outbound/inbound wallet message
  tracking where needed for idempotency.
- Wallet DB: wallets and wallet operations ledger.

Money is stored and transported as integer cents. Multipliers are stored and transported as basis
points where `10000` means `1.00x`; UI can format this as human-readable multiplier text.

## Contract Plan

See `contracts.md` for REST, WebSocket, and RabbitMQ contract direction.

Contracts must stay compatible with the official challenge route names. DTOs should be explicit,
small, and documented with Swagger/OpenAPI where exposed via REST.

## Migration and Config Plan

- Add MikroORM dependencies to both services.
- Add migrations for Game and Wallet databases.
- Add a seed/bootstrap path for the local Keycloak test player wallet that writes a `seed_credit`
  operation to the wallet ledger instead of exposing credit/debit REST endpoints.
- Keep `.env.example` as Docker Compose source for local services.
- Add frontend service back to `docker-compose.yml` after Vite scaffold and Dockerfile exist.
- Keep `bun run docker:up` as the single local stack command.

## Validation Plan

Unit tests:

- Round lifecycle and invalid transitions.
- Bet amount limits, duplicate bet, cashout once, lost/cashed-out statuses.
- Wallet debit/credit, insufficient balance, idempotency ledger, no negative balance.
- Money arithmetic without floats.
- Provably fair deterministic crash calculation and verification.

Integration/e2e:

- Bet accepted after Wallet confirms debit/reserve.
- Bet placement timeout returns a retryable wallet-confirmation state and does not create an
  accepted bet until Wallet acceptance is recorded.
- Bet rejected on insufficient balance, duplicate bet, invalid phase, invalid amount.
- Cashout accepted before crash and rejected after crash.
- Crash settles pending losses and cashed-out payouts exactly once.
- Verification endpoint returns SHA-256/HMAC-SHA256 metadata, `houseEdgeBps = 100`, seed, nonce,
  and enough data to recompute a completed crash point.
- Seed/bootstrap creates a test-player wallet balance via a `seed_credit` ledger entry without
  public credit/debit REST routes.

Realtime/manual smoke:

- Two browser tabs see the same betting/running/crashed/settled state.
- WebSocket reconnect refetches snapshots and corrects local projection.
- Cashout pending UI reconciles to accepted/rejected server truth.

Operational smoke:

- `docker compose config`.
- `bun install`.
- `bun run docker:up`.
- Health checks through direct ports and Kong routes.

## Documentation Closeout

Implementation must update affected docs plus:

- `docs/handoff.md`
- `docs/roadmap.md`
- `docs/next-spec-prompt.md`

README should be updated when setup, env, routes, tests, or trade-offs become concrete. Any new
architecture trade-off belongs in `docs/architecture-decisions.md`.

## Risks and Mitigations

- RabbitMQ request/response can become overbuilt: keep it simple and add only the idempotency needed
  for correctness.
- Bet placement timeout can create ambiguous UX if it is treated like success: return an explicit
  retryable wallet-confirmation state and rely on idempotency keys for safe retry.
- In-process round runner is simple but single-instance: acceptable for MVP; document as a trade-off
  if retained.
- Cashout boundary can feel unfair under latency: UI must show pending/reconciled states and server
  truth clearly.
- Bun is not available in the current Codex shell: validation may need a local environment pass.
- Final art is deferred: use replaceable placeholder SVG/CSS assets without coupling UI logic to
  specific artwork.

## Task Follow-up Notes

- Existing `tasks.md` remains the implementation checklist; apply this plan's clarified details
  while completing the unchecked persistence, RabbitMQ, auth, WebSocket, frontend, smoke, and docs
  tasks.
- If tasks are regenerated later, preserve the same vertical slices: dependencies/config, domain,
  persistence, messaging, REST, WebSocket, frontend, tests, and docs.
- Keep bonus scope out unless the MVP gates pass.

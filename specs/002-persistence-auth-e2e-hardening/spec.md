# Feature Specification: Persistence, Auth, and E2E Hardening

**Feature Branch**: `002-persistence-auth-e2e-hardening`  
**Created**: 2026-06-20  
**Status**: Planned  
**Input**: `docs/next-spec-prompt.md` and user `/speckit-specify` request

## Summary

Promote Jungle Crash Game from a locally smoke-validated gameplay MVP into durable challenge
delivery. The Game and Wallet services must use PostgreSQL-backed MikroORM runtime repositories in
the Docker/local profile, real Keycloak login must become the primary player path, and automated
e2e coverage must prove critical money, gameplay, persistence, RabbitMQ, and auth behavior.

This feature hardens the completed `specs/001-gameplay-foundation/` slice. It preserves the current
server-authoritative crash game, DDD boundaries, integer cents, multiplier basis points,
provably-fair SHA-256/HMAC-SHA256 metadata, RabbitMQ service boundary, no public arbitrary wallet
credit/debit REST APIs, and goat/mountain UI direction.

## Existing Artifact Alignment

`specs/001-gameplay-foundation/` already specified the intended durable and RabbitMQ-backed target,
but the completed implementation deliberately used in-memory runtime repositories and an internal
Wallet HTTP adapter to validate the gameplay loop quickly. This is not a product conflict; it is a
temporary implementation trade-off captured in `docs/handoff.md`, `docs/roadmap.md`, and
`docs/architecture-decisions.md`.

This feature resolves the remaining gates from the foundation tasks:

- Execute and document MikroORM migrations for the `games` and `wallets` databases.
- Wire PostgreSQL/MikroORM repositories as active Game and Wallet runtime providers.
- Add automated RabbitMQ/e2e coverage for wallet confirmation, retry, and idempotency behavior.
- Make real Keycloak login the primary UI path.
- Validate two-client WebSocket convergence and responsive desktop/mobile layout.

Temporary in-memory repositories, local `x-player-id` identity, and the internal Wallet HTTP
gateway may remain only as explicit dev/smoke modes. They must not be the default Docker/local
challenge delivery path.

## Clarifications

- Migrations must run automatically for the Docker/local challenge setup so a reviewer can use the
  normal stack entry point without manual database surgery. Documentation must also include a short
  MikroORM migration tutorial for first-time MikroORM users, including what the command does, when
  to run it manually, and how to recognize successful output.
- If the Game Service restarts during an active round, it must not discard player-visible state or
  silently erase a round that other players were using. It must preserve accepted bets and safely
  reconcile the interrupted round from PostgreSQL. If the exact running timer cannot be resumed
  faithfully, the service may move the interrupted round to a documented terminal/reconciled state
  and open a new betting round, but history, bets, wallet effects, and verification/audit data must
  remain durable and explainable.
- RabbitMQ wallet effects are the default Docker/local challenge delivery transport. The internal
  Wallet HTTP adapter may remain only as an explicit dev/smoke adapter.
- API/e2e auth coverage should use deterministic Keycloak realm/token setup where practical, while
  browser validation must cover the real Keycloak login path. Keep this auth test support small and
  avoid a large custom authentication harness.
- Two-client validation means two browser clients must display the same server-authoritative game
  truth, not merely similar visuals. It must prove both clients converge on the same round phase,
  accepted bets, cashout/crash result, wallet effects, and history after events or reconnects.

## User Stories and Acceptance Criteria

### Story 1: Durable Game state survives restart

As a player, I want rounds, bets, history, and verification records to survive a Game Service
restart so the game feels trustworthy and auditable.

Acceptance criteria:

- Given a current round exists, when the Game Service restarts, then the service resumes or safely
  reconciles the current round from PostgreSQL without losing accepted bets.
- Given a running round has accepted bets when the Game Service restarts, then the service does not
  silently discard that round or erase player-visible participation; it preserves the round record,
  accepted bets, wallet effects, and an explainable resumed or reconciled outcome.
- Given completed rounds exist before restart, when the service starts again, then round history
  still returns those rounds in the expected order.
- Given a player placed bets before restart, when the player opens bet history after restart, then
  their bet history still contains those bets with accurate statuses, amounts, multipliers, and
  payouts.
- Given a completed round has verification metadata, when verification is requested after restart,
  then the response still includes enough SHA-256/HMAC-SHA256 metadata to recompute the crash
  multiplier.
- Given domain code is inspected, then Game domain entities and value objects remain free of NestJS,
  MikroORM, RabbitMQ, WebSocket, controller, and DTO imports.

### Story 2: Durable Wallet balances and ledger survive restart

As a player, I want my wallet balance and settlement ledger to survive service restarts so debits
and payouts cannot disappear or be duplicated.

Acceptance criteria:

- Given a seeded wallet balance exists, when the Wallet Service restarts, then `GET /wallets/me`
  returns the same balance.
- Given an accepted bet debit was recorded before restart, when the Wallet Service restarts, then
  the debit remains reflected in balance and ledger state.
- Given a cashout payout credit was recorded before restart, when the Wallet Service restarts, then
  the credit remains reflected in balance and ledger state.
- Given duplicate `seed_credit`, `debit_bet`, or `credit_payout` operations arrive with the same
  idempotency key, then the wallet applies the effect at most once and returns a consistent
  duplicate-safe result.
- Given a debit would exceed the current balance, then the debit is rejected and the wallet balance
  never becomes negative.
- Given domain code is inspected, then Wallet domain entities and value objects remain free of
  NestJS, MikroORM, RabbitMQ, WebSocket, controller, and DTO imports.

### Story 3: Local setup runs migrations repeatably

As a reviewer starting the challenge locally, I want database setup to be repeatable from tracked
files so I can run and validate the stack without manual database surgery.

Acceptance criteria:

- Given the Docker stack is fresh, when setup runs, then PostgreSQL creates the `games` and
  `wallets` databases and MikroORM migrations create the required tables for both services.
- Given a reviewer starts the local challenge stack through the normal documented command, then
  migrations run automatically before the services depend on migrated tables.
- Given migrations have already run, when setup or the documented migration commands run again,
  then they complete without destructive side effects and report no unexpected pending work.
- Given PostgreSQL 18 is used, then the Docker volume path remains `/var/lib/postgresql`.
- Given `docker/postgres/init-databases.sh` is inspected, then it keeps LF line endings and uses
  `/bin/sh`.
- Given a reviewer reads the setup docs, then the docs include the exact migration commands and
  expected successful outcomes for both services, plus a short MikroORM beginner explanation:

```bash
cd services/games && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
cd services/wallets && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
```

### Story 4: Real Keycloak login is the primary UI path

As a player, I want to log in through Keycloak so my player identity comes from the configured IdP
rather than an implicit local fallback.

Acceptance criteria:

- Given a user opens the frontend in normal Docker/local mode, when they are not authenticated,
  then the primary path sends them through Keycloak login.
- Given the user completes Keycloak login, when they use Game and Wallet routes, then requests use
  the bearer token and backend services derive `PlayerId` from the JWT `sub`.
- Given the UI is authenticated by Keycloak, then the UI clearly indicates the user is using
  Keycloak identity.
- Given explicit dev/smoke mode is enabled, then local `x-player-id` identity may be used and the
  UI clearly indicates dev identity mode.
- Given explicit dev/smoke mode is not enabled, then local `x-player-id` fallback is not the
  primary path and cannot silently mask a failed Keycloak login.

### Story 5: Bet acceptance is proven through wallet confirmation

As a player, I want a bet to count only after wallet confirmation so accepted bets always correspond
to real reserved balance.

Acceptance criteria:

- Given a round is in betting phase and the player has sufficient balance, when the player places a
  valid bet, then the bet is accepted only after Wallet confirms the `debit_bet` operation.
- Given Wallet confirms the debit, then Game records the accepted bet, Wallet balance decreases by
  the exact bet amount, and WebSocket clients receive the accepted bet projection.
- Given Wallet times out or no confirmation arrives within the documented timeout, then the Game
  Service returns a retryable wallet-confirmation state and does not create an accepted bet.
- Given the player retries after a timeout, then idempotency prevents duplicate debits or duplicate
  accepted bets.
- Given Wallet rejects for insufficient balance, then Game rejects the bet and no accepted bet is
  recorded.

### Story 6: Critical gameplay and money rejections are covered

As a reviewer, I want automated tests for money and gameplay boundaries so the eliminatory criteria
are protected from regression.

Acceptance criteria:

- Automated e2e coverage proves insufficient balance rejects the bet and leaves balance unchanged.
- Automated e2e coverage proves a duplicate bet in the same round is rejected.
- Automated e2e coverage proves bets outside the betting phase are rejected.
- Automated e2e coverage proves invalid amounts below `1.00` or above `1000.00` are rejected.
- Automated e2e coverage proves cashout before crash is accepted, records multiplier/payout, and
  credits Wallet exactly once.
- Automated e2e coverage proves cashout after crash is rejected and does not credit Wallet.
- Automated e2e coverage proves seeded wallet setup creates the starting balance through an
  idempotent `seed_credit` ledger operation.
- Automated e2e coverage proves verification metadata for completed rounds can recompute the
  recorded crash multiplier.
- Automated e2e coverage proves duplicate RabbitMQ wallet messages do not duplicate debits or
  credits.

### Story 7: Browser validation proves realtime convergence and responsive gameplay

As a player, I want multiple clients and device sizes to show the same authoritative game state so
the game feels consistent.

Acceptance criteria:

- Given two authenticated browser clients are connected, when a round moves through betting,
  running, crashed, and settled states, then both clients converge on the same phase, multiplier,
  crash point, bet statuses, wallet effects, and history updates.
- Given one client reconnects during a running round, then it refetches snapshots and reconciles its
  hot local projection with server truth.
- Given the UI is viewed on desktop and mobile widths, then game scene, wallet/player status, bet
  controls, cashout controls, history, and verification areas remain usable without incoherent
  overlap.
- Given goat run/jump/idle sprites are replaced with equivalent image assets, then game logic,
  WebSocket handling, REST behavior, and payout results are unchanged.

## Functional Requirements

- **FR-001**: Game runtime providers in the Docker/local challenge profile must use PostgreSQL-backed
  MikroORM repositories for current rounds, completed rounds, bets, player bet history, message
  receipts, and verification metadata.
- **FR-002**: Wallet runtime providers in the Docker/local challenge profile must use
  PostgreSQL-backed MikroORM repositories for wallet balances and wallet operation ledger state.
- **FR-003**: Current round, completed round history, accepted bets, cashout data, and verification
  metadata must survive Game Service restart.
- **FR-004**: Wallet balances and `seed_credit`, `debit_bet`, and `credit_payout` ledger records
  must survive Wallet Service restart.
- **FR-005**: Wallet operation idempotency must be enforced by operation type and idempotency key so
  repeated messages or calls apply the effect at most once.
- **FR-006**: Wallet balance must never become negative under normal requests, retries, duplicate
  messages, or service restarts.
- **FR-007**: Public Wallet REST APIs must remain limited to player-safe wallet creation/read flows
  and must not expose arbitrary public credit/debit endpoints.
- **FR-008**: The Docker/local setup must run or document repeatable MikroORM migrations for both
  `games` and `wallets` databases, with automatic migration execution as part of the normal local
  challenge startup.
- **FR-009**: Setup docs must state exact migration commands, prerequisites, and expected successful
  outcomes, including a short tutorial for manually running and understanding MikroORM migrations.
- **FR-010**: PostgreSQL 18 Docker configuration must keep the data volume mounted at
  `/var/lib/postgresql`.
- **FR-011**: `docker/postgres/init-databases.sh` must remain compatible with `/bin/sh` and LF line
  endings.
- **FR-012**: Keycloak OIDC login must be the primary frontend identity flow in normal Docker/local
  mode.
- **FR-013**: Backend authenticated routes must derive player identity from bearer JWT `sub` when
  Keycloak mode is active.
- **FR-014**: Local `x-player-id` identity may remain only behind an explicit dev/smoke mode and the
  UI must visibly label that mode.
- **FR-015**: Bet acceptance must require Wallet confirmation; timeout or missing confirmation must
  not create an accepted bet.
- **FR-016**: RabbitMQ wallet debit and payout message handling must be the default Docker/local
  wallet-effect path, idempotent, and covered by automated tests.
- **FR-017**: Automated e2e tests must cover bet accepted, wallet timeout/retry, insufficient
  balance, duplicate bet, invalid phase, invalid amount, cashout accepted, cashout rejected after
  crash, seeded wallet balance, verification metadata, and duplicate wallet messages.
- **FR-018**: Two-client WebSocket convergence must be validated through automated browser coverage
  or a documented manual browser script with concrete expected observations.
- **FR-019**: Desktop and mobile gameplay layouts must be validated for usability and absence of
  incoherent overlap.
- **FR-020**: Goat sprite assets must remain replaceable presentation assets and must not affect
  game rules, wallet effects, or settlement behavior.
- **FR-021**: Existing Game and Wallet domain code must remain infrastructure-free according to the
  project DDD boundary rules.
- **FR-022**: `bun run docker:up` must remain the primary local stack entry point from tracked
  project files.

## Key Entities and Data To Preserve

- **Round**: Current and completed crash-game round state, lifecycle status, timestamps,
  crashMultiplierBps, houseEdgeBps, verification commitment/reveal data, and settlement state.
- **Bet**: Player wager inside a round, including player id, amount cents, status, cashout
  multiplier, payout cents, and timestamps.
- **Wallet**: Player balance aggregate stored in integer cents and protected from negative balance.
- **WalletOperation**: Idempotent ledger entry for `seed_credit`, `debit_bet`, and `credit_payout`
  operations keyed by stable idempotency data.
- **GameMessageReceipt**: Idempotency and reconciliation record for wallet request/result handling
  where needed by the Game Service.
- **PlayerId**: Stable authenticated player identifier derived from Keycloak JWT `sub` in normal
  mode or explicit dev identity only in dev/smoke mode.

## Edge Cases

- Game Service restarts during betting after one or more accepted bets.
- Game Service restarts during running before crash.
- Game Service restarts after crash but before settlement is fully reflected to clients.
- Game Service restarts during an active round with accepted bets from multiple players.
- Wallet Service restarts after a debit request is processed but before a duplicate message arrives.
- Wallet Service restarts after a payout credit is processed but before Game observes the result.
- RabbitMQ redelivers a debit or payout message after the operation was already committed.
- Wallet confirmation times out for Game while Wallet later processes or rejects the request.
- A user opens the frontend with an expired Keycloak session.
- A dev-mode identity is configured accidentally in a normal profile.
- A completed round's verification endpoint is requested after service restart.
- A goat sprite image is missing or replaced with a different image size.
- Mobile viewport is used while a round is running and cashout is available.

## Non-Goals

- Auto cashout.
- Auto bet.
- Leaderboard.
- Sound effects.
- Observability dashboards.
- Storybook.
- Final goat or mountain artwork polish.
- Mountain curve rendering based on multiplier formula.
- Admin/operator back office.
- Multi-instance round-runner leader election.
- Transactional outbox/inbox beyond the idempotency needed for this feature.
- Replacing Keycloak, Kong, RabbitMQ, PostgreSQL, MikroORM, Docker Compose, Vite, React, TanStack
  Query, or Zustand with alternate providers.
- Cosmetic UI redesign unrelated to auth clarity, responsive usability, or validation of existing
  goat/mountain gameplay.

## Success Criteria

- Fresh Docker/local setup can run migrations for both services and start the stack from tracked
  files through the normal startup path.
- Game and Wallet runtime state persists through service restarts in the Docker/local challenge
  profile.
- Real Keycloak login is the default player path, and dev identity is explicit and visibly labeled
  when enabled.
- Automated e2e coverage protects the critical bet, cashout, wallet, idempotency, and verification
  paths listed in this spec.
- Two browser clients converge on the same server-authoritative round state.
- Desktop and mobile browser validation shows the existing game UI remains usable.
- Domain boundary checks still show no framework, ORM, messaging, WebSocket, controller, or DTO
  imports in domain layers.

## Assumptions

- PostgreSQL, MikroORM, RabbitMQ, Kong, Keycloak, Vite React, TanStack Query, Zustand, and Docker
  Compose remain the target stack.
- Existing MikroORM mapping and migration artifacts are a starting point, but this spec defines the
  observable behavior required from active runtime wiring.
- The internal Wallet HTTP adapter can remain useful for explicit dev smoke, but RabbitMQ is the
  default wallet-effect path for Docker/local challenge delivery.
- In-memory repositories can remain useful for unit tests or explicit dev mode, but not as the
  default Docker/local challenge delivery runtime.
- Existing SHA-256 seed commitment, HMAC-SHA256 crash derivation, and `houseEdgeBps = 100` remain
  the provably fair baseline.
- Browser validation may combine automated coverage and documented manual steps if full automation
  would distract from the persistence/auth/e2e hardening goal.

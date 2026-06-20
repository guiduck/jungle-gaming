# Feature Specification: Gameplay Foundation

**Feature Branch**: `001-gameplay-foundation`  
**Created**: 2026-06-19  
**Status**: Planned  
**Input**: `docs/next-spec-prompt.md`

## Summary

Build the gameplay foundation for Jungle Crash Game: authenticated players can enter the game,
place one valid bet during the betting window, watch the server-authoritative multiplier progress
in real time, cash out before the crash, lose on crash if still pending, see wallet updates, inspect
round history, and verify previous crash points.

This feature covers the minimum gameplay loop required by the challenge. It intentionally keeps
bonus features out of scope until the eliminatory criteria are satisfied.

## Clarifications

- Bet acceptance uses a reserve/debit-first flow: the Game Service only confirms a bet after the
  Wallet Service confirms the wallet effect. If wallet reservation/debit fails, the bet is not
  accepted.
- Cashout truth is server-authoritative. The UI may stay smooth and latency-tolerant while waiting
  for confirmation, but it must clearly reconcile to the server result whether the cashout is
  accepted or rejected.
- Cashout near the crash boundary is accepted only when the server processes it before the official
  crash decision. The implementation may use simple latency-aware UX feedback, but must not invent
  client-side payout truth.
- Provably fair uses a simple hash-chain plus HMAC approach: pre-round commitment, post-round
  reveal, deterministic crash calculation, and documented house edge.
- KISS is a project rule. Prefer the simplest correct algorithm, event flow, and data model that
  satisfies the challenge; avoid speculative abstractions and bonus-grade infrastructure until the
  MVP works.
- Provably fair defaults are fixed for the MVP: `houseEdgeBps` is `100`, the commitment is the
  SHA-256 hash of the server seed, and the crash multiplier is derived from HMAC-SHA256 using the
  server seed and nonce. The implementation must expose enough formula metadata for players to
  recompute the recorded basis-point multiplier.
- For MVP bet placement, the HTTP request waits for the RabbitMQ wallet result for a short,
  documented timeout. If no wallet result arrives in time, the response must be a clear retryable
  wallet-confirmation state; the bet is not treated as accepted by the Game Service until an
  accepted wallet result is recorded.
- The local test player wallet must be funded through a seed/bootstrap path that records a
  `seed_credit` wallet operation. Public REST APIs still must not expose arbitrary wallet credit or
  debit operations.
- WebSocket implementation should use NestJS WebSockets with the already selected stack, defaulting
  to the simplest Socket.IO-compatible adapter unless implementation findings show `ws` is smaller
  or more reliable for the local Docker delivery.

## User Stories and Acceptance Criteria

### Story 1: Player joins the game and sees the current round

As an authenticated player, I want to open the game screen and immediately understand the current
round phase, my wallet balance, the multiplier state, and recent outcomes.

Acceptance criteria:

- Given the player is authenticated, when the game screen loads, then the UI displays wallet
  balance, current round state, betting countdown or running multiplier, current bets, and recent
  round history.
- Given the current round is in betting phase, then the UI enables bet entry and disables cashout.
- Given the current round is running, then the UI disables bet entry and enables cashout only if the
  player has a pending bet.
- Given the frontend reconnects after a refresh or WebSocket interruption, then it reconciles from
  server snapshots and resumes the correct projected game state.

### Story 2: Player places one bet during the betting window

As a player, I want to place one bet before the round starts so I can participate in the round.

Acceptance criteria:

- Given the round is accepting bets and the player has sufficient balance, when the player submits a
  valid amount, then the bet is accepted once for that round and appears in the current bet list.
- Given the player already has a bet in the round, when the player submits another bet, then the bet
  is rejected with a clear error.
- Given the amount is below `1.00` or above `1000.00`, then the bet is rejected with a clear error.
- Given the round is running, crashed, or settling, then bet placement is rejected.
- Given wallet reservation/debit cannot be completed, then the bet is not considered accepted and
  the UI receives a clear failure state.

### Story 3: Player cashes out before crash

As a player with a pending bet, I want to cash out while the round is running so I can lock in a
payout before the crash.

Acceptance criteria:

- Given the round is running and the player has a pending bet, when the player cashes out, then the
  server records the cashout multiplier and payout.
- Given cashout succeeds, then the bet status becomes `cashed_out`, the player cannot cash out the
  same bet again, and the UI highlights the cashout.
- Given the player has no pending bet, already cashed out, or the round is not running, then cashout
  is rejected with a clear error.
- Given cashout is accepted near the crash boundary, then the server decision is authoritative and
  clients converge on the accepted or rejected outcome.
- Given the UI sends a cashout request during network latency, then it may show a pending/smooth
  feedback state, but it must update to the authoritative server result when received.

### Story 4: Round crashes and settlement completes

As a player or observer, I want the round crash and settlement to be visible and consistent across
clients so I can trust the result.

Acceptance criteria:

- Given the predetermined crash point is reached, when the round crashes, then all pending bets are
  marked lost and cashed-out bets keep their payout.
- Given settlement completes, then wallet balances reflect accepted debits and credits exactly once.
- Given multiple clients are connected, then all clients observe the same phase transition, crash
  multiplier, bet statuses, and updated history.
- Given a settlement event is retried, then wallet effects remain idempotent and balances do not
  duplicate credits or debits.

### Story 5: Player verifies previous rounds

As a player, I want to inspect verification data for completed rounds so I can confirm the crash
point was predetermined and reproducible.

Acceptance criteria:

- Given a round is completed, when the player opens verification data, then the server returns the
  pre-round commitment and post-round reveal data needed to verify the crash point.
- Given the same verification data is recalculated independently, then the resulting crash point
  matches the recorded crash multiplier.
- Given a round is current or not yet revealed, then private seed data is not exposed early.

## Functional Requirements

- **FR-001**: The system must expose the current round state through the existing Game Service route
  shape: `GET /games/rounds/current`.
- **FR-002**: The system must expose paginated round history through `GET /games/rounds/history`.
- **FR-003**: The system must expose provably fair verification data for completed rounds through
  `GET /games/rounds/:roundId/verify`.
- **FR-004**: The system must expose the authenticated player's bet history through
  `GET /games/bets/me`.
- **FR-005**: The system must accept player bets through `POST /games/bet`.
- **FR-006**: The system must accept cashout requests through `POST /games/bet/cashout`.
- **FR-007**: The system must expose wallet creation and current wallet state through the existing
  Wallet Service route shape: `POST /wallets` and `GET /wallets/me`.
- **FR-008**: Public REST APIs must not expose arbitrary wallet credit or debit operations.
- **FR-009**: A round must move through the lifecycle `betting`, `running`, `crashed`, and
  `settled`.
- **FR-010**: A player must have at most one accepted bet per round.
- **FR-011**: Bets must be accepted only during `betting`.
- **FR-012**: Cashout must be accepted only during `running` for a pending bet owned by the
  authenticated player.
- **FR-013**: Bet amount validation must enforce the challenge limits: minimum `1.00`, maximum
  `1000.00`.
- **FR-014**: Wallet balances, bet amounts, payouts, debits, and credits must use exact money
  representation and must not use floating point arithmetic.
- **FR-015**: Wallet balance must never become negative.
- **FR-016**: Game and Wallet services must communicate wallet reservation, debit, credit, and
  settlement effects asynchronously through RabbitMQ.
- **FR-017**: RabbitMQ message handling for wallet effects must be idempotent across retries.
- **FR-017A**: A bet must become accepted only after the Wallet Service confirms the required
  reserve/debit effect.
- **FR-018**: WebSocket communication must be server-to-client push only for game synchronization;
  player actions must remain REST actions.
- **FR-019**: WebSocket events must let clients synchronize betting-window start/end, round start,
  multiplier progression, accepted bets, accepted cashouts, crash reveal, settlement completion,
  and history refresh.
- **FR-020**: The frontend must treat the server as source of truth and use local state only as a
  projection for rendering and animation.
- **FR-021**: The frontend must use TanStack Query for persisted server state and Zustand for hot
  game state such as current phase, displayed multiplier, countdown, bet list projection, cashout
  status, and goat/mountain animation flags.
- **FR-022**: The crash visual must preserve the goat climbing a mountain direction while keeping
  the numeric multiplier prominent and accessible.
- **FR-023**: Completed rounds must store enough provably fair data for independent player
  verification without exposing unrevealed private seed data before a round ends.
- **FR-024**: The local stack must remain runnable through `bun run docker:up` without manual
  infrastructure setup.
- **FR-025**: Provably fair implementation must use a simple hash-chain plus HMAC commitment/reveal
  design and document the house edge used by the crash calculation.
- **FR-026**: Gameplay implementation must prefer simple, readable flows over generalized
  abstractions, unless extra complexity is required to satisfy correctness, idempotency, or
  challenge criteria.

## Key Entities

- **Round**: Aggregate root for a single crash game round. Owns lifecycle, crash point,
  verification commitment/reveal data, and the bets for that round.
- **Bet**: Player wager inside a round. Tracks amount, status, cashout multiplier, and payout.
- **Wallet**: Player balance aggregate. Owns debit/credit invariants and operation idempotency.
- **Money**: Exact value object for all monetary amounts.
- **CrashPoint**: Predetermined multiplier value object derived from provably fair data.
- **PlayerId**: Stable authenticated player identifier derived from JWT subject.

## Realtime Synchronization

The system must support multiple browser tabs or clients observing the same round.

Required event categories:

- Round betting opened.
- Bet accepted.
- Round started.
- Multiplier tick or multiplier sync.
- Cashout accepted.
- Round crashed.
- Settlement completed.
- Round history changed.

Clients must be able to recover from missed events by refetching current round and wallet snapshots.

## Edge Cases

- Player submits a bet at the exact moment the betting window closes.
- Player submits cashout at the exact moment the crash point is reached.
- Player sees a smooth pending cashout state, but the server rejects the cashout because it arrived
  after the official crash decision.
- RabbitMQ redelivers a wallet debit or credit message.
- WebSocket disconnects during a running round.
- Player refreshes page after placing a bet but before cashing out.
- Wallet does not exist for an authenticated player.
- Current round has no bets.
- History endpoint has fewer than 20 completed rounds.
- Verification is requested for an unknown, current, or unrevealed round.

## Non-Goals

- Auto cashout.
- Auto bet.
- Leaderboard.
- Sound effects.
- Observability dashboards.
- Storybook.
- Playwright browser tests beyond optional future smoke coverage.
- Final goat and mountain artwork.
- Admin/operator back office.
- Changing Keycloak, Kong, RabbitMQ, PostgreSQL, or Docker Compose to alternate providers.

## Success Criteria

- A player can complete the flow: authenticate, create/read wallet, place bet, observe multiplier,
  cash out or crash, and see wallet/history update.
- Two connected clients converge on the same round state and crash result.
- Domain unit tests cover round lifecycle, bet invariants, wallet money safety, and provably fair
  determinism.
- API e2e tests cover bet/cashout happy paths and rejection cases.
- RabbitMQ retry behavior cannot duplicate wallet debits or credits.
- `bun run docker:up` remains the one-command local stack entry point.

## Assumptions

- Keycloak remains the IdP and JWT source for player identity.
- Kong remains the public gateway for REST routes.
- RabbitMQ remains the broker for Game/Wallet communication.
- MikroORM remains the persistence ORM.
- The MVP provably fair formula and house edge are fixed by clarification: SHA-256 seed
  commitment, HMAC-SHA256 crash derivation, `houseEdgeBps = 100`, pre-round commitment,
  post-round reveal, and deterministic verification.
- Placeholder goat/mountain visuals are acceptable for MVP if the state contract and animation
  behavior are correct.

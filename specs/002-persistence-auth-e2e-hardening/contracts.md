# Contracts: Persistence, Auth, and E2E Hardening

## REST Contracts

No public route shape changes are planned.

Game routes preserved:

- `GET /games/rounds/current`
- `GET /games/rounds/history`
- `GET /games/rounds/:roundId/verify`
- `GET /games/bets/me`
- `POST /games/bet`
- `POST /games/bet/cashout`

Wallet routes preserved:

- `POST /wallets`
- `GET /wallets/me`

Contract expectations:

- Authenticated requests use bearer JWT in Keycloak mode.
- Dev `x-player-id` is accepted only in explicit dev/smoke mode.
- Bet placement returns accepted only after Wallet confirms debit.
- Wallet timeout/missing confirmation returns a retryable failure state and does not create an
  accepted bet.
- Wallet public REST does not expose arbitrary credit/debit endpoints.

## RabbitMQ Contracts

Existing event categories remain the target:

- `wallet.bet_debit_requested`
- `wallet.payout_credit_requested`
- `wallet.bet_debit_accepted`
- `wallet.bet_debit_rejected`
- `wallet.payout_credit_accepted`
- `wallet.payout_credit_rejected`

Required payload properties:

- `idempotencyKey`
- `playerId`
- `roundId`
- `betId`
- `amountCents`
- `occurredAt`
- `cashoutMultiplierBps` for payout credit requests
- `reason` for rejected result events

Behavioral contract:

- Wallet applies each idempotency key at most once.
- Game does not accept a bet before an accepted debit result.
- Timeout is retryable and not success.
- Duplicate request/result messages must not duplicate balance changes, accepted bets, or payouts.

## WebSocket Contracts

WebSocket remains server-to-client projection. Player actions remain REST.

Existing event categories remain:

- `round.betting_opened`
- `round.started`
- `round.multiplier`
- `round.crashed`
- `round.settled`
- `bet.accepted`
- `cashout.accepted`
- `cashout.rejected`
- `history.updated`

Projection requirements:

- Events include round id and server timestamp.
- Clients can recover missed events by refetching current round, wallet, history, and player bet
  snapshots.
- Two clients must converge on the same server-authoritative state after event delivery or
  reconnect.

## Auth Contracts

Keycloak mode:

- Frontend uses OIDC authorization code with PKCE.
- API requests include bearer token.
- Backend guards derive `PlayerId` from JWT `sub`.
- UI labels the session as Keycloak-authenticated.

Dev mode:

- Enabled only by explicit configuration.
- Frontend may send `x-player-id`.
- UI labels the session as dev identity.
- Dev fallback must not silently mask Keycloak login failures in normal mode.

## Migration Contracts

Automatic local startup:

- PostgreSQL starts and creates `games` and `wallets` databases.
- One-shot migration services or equivalent scripts apply Game and Wallet migrations.
- Game and Wallet services start only after their migrations complete successfully.

Manual commands:

```bash
cd services/games && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
cd services/wallets && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
```

Expected behavior:

- First run applies pending migrations.
- Later runs complete safely with no unexpected changes.
- Failures are visible in command/Compose logs.

## E2E Coverage Contract

Automated e2e coverage must prove:

- Bet accepted after wallet confirmation.
- Wallet timeout/retry does not create an accepted bet.
- Insufficient balance rejects the bet and leaves balance unchanged.
- Duplicate bet in the same round is rejected.
- Invalid phase rejects bet placement.
- Invalid amount rejects bet placement.
- Cashout before crash records multiplier/payout and credits Wallet exactly once.
- Cashout after crash is rejected and does not credit Wallet.
- Seeded wallet balance is created through idempotent `seed_credit`.
- Verification metadata recomputes the recorded crash multiplier.
- Duplicate wallet messages do not duplicate debits or credits.
- Selected Game and Wallet state survives service restart.

Browser/manual validation must prove:

- Real Keycloak login works in browser.
- Two clients converge on the same authoritative state.
- Mobile and desktop layouts remain usable.
- Goat sprite replacement does not affect game logic.

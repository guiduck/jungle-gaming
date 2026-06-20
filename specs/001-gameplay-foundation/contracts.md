# Contracts: Gameplay Foundation

## REST

All public REST routes are served through Kong.

### Game Service

`GET /games/rounds/current`

- Auth: no.
- Returns current round phase, timing, commitment hash, multiplier snapshot, public bets, and
  current player bet if authenticated context is available.

`GET /games/rounds/history`

- Auth: no.
- Returns paginated completed rounds with crash multiplier and verification availability.

`GET /games/rounds/:roundId/verify`

- Auth: no.
- Returns commitment, revealed seed, nonce, `houseEdgeBps`, formula metadata, and recorded crash
  multiplier for completed/revealed rounds.
- Formula metadata must identify the MVP algorithm as SHA-256 seed commitment plus HMAC-SHA256 crash
  derivation with `houseEdgeBps = 100`.

`GET /games/bets/me`

- Auth: yes.
- Returns paginated player bet history.

`POST /games/bet`

- Auth: yes.
- Body: bet amount as `amountCents`.
- Result: accepted bet, clear rejection, or retryable wallet-confirmation timeout. Bet is accepted
  only after Wallet confirms reserve/debit.
- Timeout responses must not present the bet as accepted; clients can retry safely with the same
  player/round constraints and backend idempotency.

`POST /games/bet/cashout`

- Auth: yes.
- Body: current round/bet identity if needed.
- Result: accepted/rejected cashout with authoritative multiplier and payout when accepted.

### Wallet Service

`POST /wallets`

- Auth: yes.
- Creates wallet for authenticated player if missing; idempotent for existing wallet.

`GET /wallets/me`

- Auth: yes.
- Returns wallet id, player id, and balance.

## WebSocket Events

Server-to-client only. Use NestJS WebSockets for the MVP transport, defaulting to the simplest
Socket.IO-compatible adapter unless implementation findings show `ws` is smaller or more reliable
for Docker delivery.

- `round.betting_opened`
- `round.started`
- `round.multiplier`
- `round.crashed`
- `round.settled`
- `bet.accepted`
- `cashout.accepted`
- `cashout.rejected`
- `history.updated`

Event payloads should include:

- event id or monotonically increasing sequence where simple to provide
- round id
- server timestamp
- enough state for clients to update local projection

Clients must refetch current round and wallet snapshots on reconnect.

## RabbitMQ Events

Keep event names explicit and few.

Game -> Wallet:

- `wallet.bet_debit_requested`
- `wallet.payout_credit_requested`

Wallet -> Game:

- `wallet.bet_debit_accepted`
- `wallet.bet_debit_rejected`
- `wallet.payout_credit_accepted`
- `wallet.payout_credit_rejected`

Required payload fields:

- `eventId`
- `idempotencyKey`
- `playerId`
- `roundId`
- `betId`
- `amountCents`
- multiplier fields use basis points when present, with `10000` equal to `1.00x`
- `occurredAt`
- rejection reason for rejected events

RabbitMQ handlers must treat duplicate `idempotencyKey` values as already processed and return the
same logical result where possible.

## Auth Contract

- Frontend authenticates through Keycloak.
- Backend validates JWTs for authenticated endpoints.
- Domain receives a `PlayerId`; it does not know Keycloak token shape.

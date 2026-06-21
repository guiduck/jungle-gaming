# Contracts: Server-Authoritative Auto-Cashout

## Public REST Compatibility

No route names change.

Preserved routes:

- `GET /games/rounds/current`
- `GET /games/rounds/history`
- `GET /games/rounds/:roundId/verify`
- `GET /games/bets/me`
- `POST /games/bet`
- `POST /games/bet/cashout`
- `POST /wallets`
- `GET /wallets/me`

## `POST /games/bet`

Existing request:

```json
{
  "amountCents": 250
}
```

New additive request:

```json
{
  "amountCents": 250,
  "autoCashoutMultiplierBps": 15000
}
```

Field rules:

- `amountCents`: unchanged; integer cents, existing `1.00` to `1000.00` bounds.
- `autoCashoutMultiplierBps`: optional nullable integer.
- Valid target range: `11000` to `1000000` inclusive.
- Omitted or null disables auto-cashout.
- Invalid target rejects before Wallet debit.

Response:

- Same `Round` snapshot shape, with additive optional fields on `Bet`.

## Bet Snapshot Additions

```json
{
  "id": "bet-player-round",
  "playerId": "player-id",
  "amountCents": 250,
  "status": "cashed_out",
  "cashoutMultiplierBps": 15000,
  "payoutCents": 375,
  "autoCashoutMultiplierBps": 15000,
  "cashoutTrigger": "auto"
}
```

Compatibility:

- Existing clients can ignore `autoCashoutMultiplierBps` and `cashoutTrigger`.
- Manual-only bets omit `autoCashoutMultiplierBps`.
- Pending or lost bets omit or null `cashoutTrigger`.

## `POST /games/bet/cashout`

Request remains unchanged:

```json
{
  "multiplierBps": 12500
}
```

Manual cashout response remains a `Round` snapshot. For manually cashed-out bets,
`cashoutTrigger` should be `manual`.

If auto-cashout already cashed out the bet, manual cashout must not create a second payout. It may
reuse the existing non-pending/already-cashed-out domain rejection behavior.

## WebSocket Contract

No new event names are required.

Reuse:

- `bet.accepted`
- `cashout.accepted`
- `cashout.rejected`
- `round.multiplier`
- `round.crashed`
- `round.settled`
- `history.updated`

### `bet.accepted`

Add optional data:

```json
{
  "roundId": "round-1",
  "betId": "bet-1",
  "playerId": "player-1",
  "amountCents": 250,
  "walletOperationKey": "bet-debit:round-1:player-1",
  "autoCashoutMultiplierBps": 15000
}
```

### `cashout.accepted`

Add optional/expanded data:

```json
{
  "roundId": "round-1",
  "betId": "bet-1",
  "playerId": "player-1",
  "multiplierBps": 15000,
  "payoutCents": 375,
  "cashoutTrigger": "auto",
  "autoCashoutMultiplierBps": 15000
}
```

Manual cashout should use `cashoutTrigger: "manual"`.

Frontend behavior:

- Treat the event as invalidation/synchronization signal.
- Refetch snapshots where needed.
- Do not compute final payout or Wallet balance from the event alone.

## RabbitMQ Contract

No new routing keys.

Preserved request/result events:

- `wallet.bet_debit_requested`
- `wallet.bet_debit_accepted`
- `wallet.bet_debit_rejected`
- `wallet.payout_credit_requested`
- `wallet.payout_credit_accepted`
- `wallet.payout_credit_rejected`

Auto-cashout uses the existing payout request:

```json
{
  "eventName": "wallet.payout_credit_requested",
  "eventId": "event-id",
  "idempotencyKey": "payout-credit:round-1:bet-1",
  "playerId": "player-1",
  "roundId": "round-1",
  "betId": "bet-1",
  "amountCents": 375,
  "cashoutMultiplierBps": 15000,
  "occurredAt": "2026-06-21T00:00:00.000Z"
}
```

Contract expectation:

- Idempotency key is stable per bet payout.
- Trigger type must not be part of the idempotency key in a way that permits two payout credits for
  the same bet.
- Wallet does not need to distinguish manual from auto for balance correctness.

## Frontend API Contract

Update:

```ts
placeBet(amountCents: number, autoCashoutMultiplierBps?: number | null): Promise<Round>
```

Payload behavior:

- Disabled: send `{ amountCents }` or `{ amountCents, autoCashoutMultiplierBps: null }`.
- Enabled: send integer basis points.

Display conversion:

- UI text `1.50x` converts to `15000`.
- API snapshots format `15000` as `1.50x`.
- Avoid floating point as persistent truth; conversion helpers should round/validate to integer
  basis points before submit.

## Validation Contract

Required automated coverage should prove:

- Invalid `autoCashoutMultiplierBps` rejects before Wallet debit.
- Omitted/null target keeps existing manual-only behavior.
- Target below crash auto-cashes out at target.
- Target equal to crash loses.
- Manual/auto race creates one cashout and one payout idempotency key.
- Snapshot and history projections include target/trigger fields.
- Existing deterministic smoke still passes when target is absent.

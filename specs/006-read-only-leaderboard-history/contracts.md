# Contracts: Read-Only Leaderboard and Richer History

## Compatibility Summary

This feature is additive and read-only.

Unchanged:

- `POST /games/bet`
- `POST /games/bet/cashout`
- Wallet REST routes
- RabbitMQ wallet request/result events
- WebSocket event names and required payload fields
- Keycloak auth model
- crash generation and provably fair verification semantics

Changed or added:

- `GET /games/rounds/history` gains richer additive fields or returns a richer history item shape.
- `GET /games/bets/me` gains richer player bet history fields or returns a player-scoped read model.
- Recommended new endpoint: `GET /games/leaderboard`.

## REST Contracts

### GET /games/rounds/history

Purpose: recent completed round summaries.

Auth: may remain public if the response contains only completed gameplay facts and privacy-safe
display data.

Query:

- `limit?: number`
  - default: `20`
  - max: `50`
  - integer only

Response:

```json
{
  "items": [
    {
      "id": "round-123",
      "crashMultiplierBps": 46624,
      "crashedAt": "2026-06-21T12:00:00.000Z",
      "settledAt": "2026-06-21T12:00:02.000Z",
      "acceptedBetCount": 3,
      "cashedOutBetCount": 2,
      "lostBetCount": 1,
      "totalWageredCents": 750,
      "totalPayoutCents": 980,
      "verificationAvailable": true,
      "notableBets": [
        {
          "betId": "bet-player-1-123",
          "playerDisplayId": "player-1",
          "playerId": "player-1",
          "amountCents": 250,
          "status": "cashed_out",
          "cashoutMultiplierBps": 15000,
          "payoutCents": 375,
          "autoCashoutMultiplierBps": 15000,
          "cashoutTrigger": "auto"
        }
      ]
    }
  ]
}
```

Compatibility notes:

- Keep existing fields used by the frontend where practical:
  - `id`
  - `crashMultiplierBps`
  - `crashedAt`
- Verification details remain available through `GET /games/rounds/:roundId/verify`.
- Do not include unrevealed seeds for active rounds because active rounds are excluded.

### GET /games/leaderboard

Purpose: compact recent realized-win leaderboard.

Auth: may be public if response uses completed gameplay facts and privacy-safe display identifiers.

Query:

- `metric?: "payout" | "multiplier"`
  - default: `"payout"`
- `limit?: number`
  - default: `10`
  - max: `25`
  - integer only

Response:

```json
{
  "metric": "payout",
  "items": [
    {
      "rank": 1,
      "playerDisplayId": "player-1",
      "playerId": "player-1",
      "roundId": "round-123",
      "betId": "bet-player-1-123",
      "amountCents": 250,
      "payoutCents": 375,
      "cashoutMultiplierBps": 15000,
      "cashoutTrigger": "auto",
      "autoCashoutMultiplierBps": 15000,
      "crashMultiplierBps": 46624,
      "crashedAt": "2026-06-21T12:00:00.000Z"
    }
  ]
}
```

Sorting:

- `metric=payout`:
  1. `payoutCents` descending
  2. `cashoutMultiplierBps` descending
  3. `crashedAt` descending
  4. `betId` ascending
- `metric=multiplier`:
  1. `cashoutMultiplierBps` descending
  2. `payoutCents` descending
  3. `crashedAt` descending
  4. `betId` ascending

Errors:

- `400` for unsupported metric.
- `400` for non-integer or out-of-range limit.

### GET /games/bets/me

Purpose: authenticated player's richer bet history.

Auth: required through existing `KeycloakJwtGuard`; dev mode remains explicit.

Query:

- `limit?: number`
  - default: `20`
  - max: `50`
  - integer only

Preferred response:

```json
{
  "items": [
    {
      "roundId": "round-123",
      "betId": "bet-player-1-123",
      "amountCents": 250,
      "status": "cashed_out",
      "crashMultiplierBps": 46624,
      "autoCashoutMultiplierBps": 15000,
      "cashoutMultiplierBps": 15000,
      "payoutCents": 375,
      "cashoutTrigger": "auto",
      "crashedAt": "2026-06-21T12:00:00.000Z"
    }
  ]
}
```

Compatibility option:

If implementation wants to preserve the current `RoundSnapshot[]` shape for older callers, add
these fields in an additive way or introduce a new internal frontend mapper while keeping route
envelope `{ "items": [...] }`.

## WebSocket Contracts

No new WebSocket event is planned.

Existing invalidation events remain sufficient:

- `history.updated`
- `round.crashed`
- `round.settled`
- `bet.accepted`
- `cashout.accepted`

Frontend should invalidate/refetch:

- `["round-history"]`
- `["leaderboard", metric]`
- `["my-bets"]`
- existing `["round"]` and `["wallet"]` where already used

## RabbitMQ Contracts

No RabbitMQ changes.

This feature must not publish or consume:

- `wallet.bet_debit_requested`
- `wallet.payout_credit_requested`
- any new Wallet mutation event

Leaderboard/history reads never trigger wallet effects.

## Frontend API Types

Suggested local frontend types in `frontend/src/types.ts`:

```ts
export interface RoundNotableBet {
  betId: string;
  playerDisplayId: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  autoCashoutMultiplierBps?: number;
  cashoutTrigger?: "manual" | "auto";
}

export interface RoundHistorySummary {
  id: string;
  crashMultiplierBps: number;
  crashedAt: string;
  settledAt?: string;
  acceptedBetCount: number;
  cashedOutBetCount: number;
  lostBetCount: number;
  totalWageredCents: number;
  totalPayoutCents: number;
  verificationAvailable: boolean;
  notableBets: RoundNotableBet[];
}

export interface LeaderboardEntry {
  rank: number;
  playerDisplayId: string;
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: number;
  payoutCents: number;
  cashoutMultiplierBps: number;
  cashoutTrigger?: "manual" | "auto";
  autoCashoutMultiplierBps?: number;
  crashMultiplierBps: number;
  crashedAt: string;
}

export interface LeaderboardResponse {
  metric: "payout" | "multiplier";
  items: LeaderboardEntry[];
}

export interface PlayerBetHistoryEntry {
  roundId: string;
  betId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  crashMultiplierBps: number;
  autoCashoutMultiplierBps?: number;
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  cashoutTrigger?: "manual" | "auto";
  crashedAt?: string;
}
```

## Validation Contracts

Implementation should prove:

- leaderboard excludes pending/lost bets
- leaderboard excludes active/incomplete rounds
- payout and multiplier metric sorting are deterministic
- history aggregate cents use integer arithmetic
- player bet history is scoped to authenticated player id
- existing verification endpoint still returns SHA-256/HMAC-SHA256 metadata
- existing smoke flow remains valid

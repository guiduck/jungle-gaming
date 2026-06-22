# Data Model: Read-Only Leaderboard and Richer History

## Overview

This feature introduces read models only. It does not add authoritative money state, Wallet state,
new settlement state, or new gameplay commands.

Source data remains:

- `rounds`: round lifecycle, crash multiplier, server seed commitment/reveal, nonce, timestamps.
- `bets`: accepted bet amount, player id, status, cashout multiplier, payout cents,
  auto-cashout target, cashout trigger.

## Existing Entities Used

### RoundEntity

Relevant fields:

- `id`
- `status`
- `crashMultiplierBps`
- `serverSeedHash`
- `serverSeed`
- `nonce`
- `houseEdgeBps`
- `createdAt`
- `updatedAt`
- `crashedAt`
- `settledAt`
- `bets`

Completed/readable round history is filtered to records with revealed verification data:

- `serverSeed != null`

### BetEntity

Relevant fields:

- `id`
- `round`
- `playerId`
- `amountCents`
- `status`
- `cashoutMultiplierBps`
- `payoutCents`
- `autoCashoutMultiplierBps`
- `cashoutTrigger`
- `createdAt`
- `updatedAt`

Leaderboard entries use only bets where:

- `status = "cashed_out"`
- parent round is completed/revealed
- `payoutCents` and `cashoutMultiplierBps` are present

## New Read Models

### RoundNotableBet

Purpose: show compact notable completed-round bet results in richer history rows/details.

Fields:

- `betId: string`
- `playerDisplayId: string`
- `playerId: string`
- `amountCents: number`
- `status: "pending" | "cashed_out" | "lost"`
- `cashoutMultiplierBps?: number`
- `payoutCents?: number`
- `autoCashoutMultiplierBps?: number`
- `cashoutTrigger?: "manual" | "auto"`

Notes:

- For completed rounds, `pending` should normally not appear. If legacy or partial data contains a
  pending bet, display it as unavailable/pending rather than converting it in the read model.
- `playerDisplayId` is derived for UI privacy and should be deterministic.

### RoundHistorySummary

Purpose: replace or enrich the current completed-round history response with evaluator-useful
aggregate facts.

Fields:

- `id: string`
- `crashMultiplierBps: number`
- `crashedAt: string`
- `settledAt?: string`
- `acceptedBetCount: number`
- `cashedOutBetCount: number`
- `lostBetCount: number`
- `totalWageredCents: number`
- `totalPayoutCents: number`
- `verificationAvailable: boolean`
- `notableBets: RoundNotableBet[]`

Aggregation rules:

- `acceptedBetCount`: count of persisted accepted bets for the round.
- `cashedOutBetCount`: count of bets with `status === "cashed_out"`.
- `lostBetCount`: count of bets with `status === "lost"`.
- `totalWageredCents`: sum of `amountCents` for accepted bets.
- `totalPayoutCents`: sum of `payoutCents` for cashed-out bets; missing payout counts as `0`.
- `verificationAvailable`: true when the completed round has revealed verification metadata.
- `notableBets`: top few cashed-out bets by payout, then multiplier, then bet id; include lost bets
  only if implementation chooses to show a concise lost-count detail elsewhere.

### LeaderboardEntry

Purpose: compact ranking of recent realized cashout wins.

Fields:

- `rank: number`
- `playerDisplayId: string`
- `playerId: string`
- `roundId: string`
- `betId: string`
- `amountCents: number`
- `payoutCents: number`
- `cashoutMultiplierBps: number`
- `cashoutTrigger?: "manual" | "auto"`
- `autoCashoutMultiplierBps?: number`
- `crashMultiplierBps: number`
- `crashedAt: string`

Default ranking metric: `payout`.

Payout metric sorting:

1. `payoutCents` descending
2. `cashoutMultiplierBps` descending
3. `crashedAt` descending
4. `betId` ascending

Multiplier metric sorting:

1. `cashoutMultiplierBps` descending
2. `payoutCents` descending
3. `crashedAt` descending
4. `betId` ascending

Ranks are assigned after sorting and limiting.

### PlayerBetHistoryEntry

Purpose: authenticated player's recent bet history with round outcome context.

Fields:

- `roundId: string`
- `betId: string`
- `amountCents: number`
- `status: "pending" | "cashed_out" | "lost"`
- `crashMultiplierBps: number`
- `autoCashoutMultiplierBps?: number`
- `cashoutMultiplierBps?: number`
- `payoutCents?: number`
- `cashoutTrigger?: "manual" | "auto"`
- `crashedAt?: string`

Rules:

- Filter by authenticated `playerId`.
- Keep the route player-scoped; do not expose arbitrary player search.
- Include active/current bets only if the existing route behavior already does so and the UI labels
  them as not completed. Leaderboard must never include active bets.

## Limits

- Leaderboard default: `10`
- Leaderboard max: `25`
- Round history default: `20`
- Round history max: `50`
- Player bet history default: `20`
- Player bet history max: `50`

Invalid limits:

- non-integer
- less than `1`
- greater than the max

The controller/application should reject invalid query limits with `400` or clamp only if existing
project patterns favor clamping. The plan prefers explicit validation for user-supplied query
params and internal constants for defaults.

## Persistence Impact

No new table is planned.

Possible additive indexes if implementation needs them:

- `bets(status, payout_cents)`
- `bets(player_id, created_at)`
- `rounds(server_seed, crashed_at)`

Only add a migration if tests or local query shape prove an index is useful. Do not add a
materialized leaderboard table in this slice.

## Privacy

`playerDisplayId` should be deterministic and privacy-preserving:

- current authenticated player may be labeled as `You` in the frontend
- other players use shortened `playerId`, for example first 8 characters plus ellipsis
- no Keycloak profile claims, names, emails, avatars, chat handles, or social metadata

The API may return raw `playerId` for local challenge inspectability, but UI should prefer
`playerDisplayId` or a local formatting helper.

## Money and Multiplier Representation

- All money remains integer cents.
- All multipliers remain integer basis points.
- UI formatting may convert for display only.
- Aggregation must not use floating-point money arithmetic.

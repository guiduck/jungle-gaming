# Data Model: Server-Authoritative Auto-Cashout

## Overview

This feature extends the existing Game `Bet` data with optional auto-cashout metadata. Wallet data
does not change.

All money remains integer cents. All multipliers remain integer basis points where `10000` means
`1.00x`.

## Domain Entities

### Bet

Existing fields:

- `id: string`
- `playerId: PlayerId`
- `amount: Money`
- `status: "pending" | "cashed_out" | "lost"`
- `cashoutMultiplierBps?: number`
- `payoutCents?: number`

New fields:

- `autoCashoutMultiplierBps?: number`
- `cashoutTrigger?: "manual" | "auto"`

Rules:

- `autoCashoutMultiplierBps` is optional.
- Valid values are integer `11000` through `1000000` inclusive.
- Undefined/null means auto-cashout disabled.
- `cashoutTrigger` is set only when status becomes `cashed_out`.
- Existing historical bets without these fields rehydrate as manual-only, with no trigger unless
  already cashed out before this feature.

### Round

Existing role:

- Owns round lifecycle, crash point, verification metadata, and bets.

New behavior:

- Evaluates pending bets with configured auto-cashout targets while status is `running`.
- Auto-cashes out only when `autoCashoutMultiplierBps <= currentMultiplierBps` and
  `autoCashoutMultiplierBps < crashMultiplierBps`.
- Records cashout multiplier as `autoCashoutMultiplierBps`.
- Leaves target equal to crash as pending until crash, then lost.

### WalletOperation

No schema change planned.

Auto-cashout payouts reuse existing payout-credit operation behavior:

- operation category remains payout credit
- amount remains integer `payoutCents`
- idempotency key remains stable per bet payout, for example `payout-credit:{roundId}:{betId}`

## Persistence Schema

### Game DB: `bets`

Add nullable columns:

```sql
alter table bets
  add column if not exists auto_cashout_multiplier_bps integer null,
  add column if not exists cashout_trigger text null;
```

Recommended constraints, if simple in MikroORM migration:

```sql
alter table bets
  add constraint bets_auto_cashout_multiplier_bounds
  check (
    auto_cashout_multiplier_bps is null
    or (auto_cashout_multiplier_bps between 11000 and 1000000)
  );

alter table bets
  add constraint bets_cashout_trigger_known
  check (
    cashout_trigger is null
    or cashout_trigger in ('manual', 'auto')
  );
```

If constraint naming/idempotency becomes noisy in MikroORM, application/domain validation remains
required and SQL constraints may be added with careful existence checks.

### Wallet DB

No table changes planned.

## Serialization

### BetSnapshot

Add optional fields:

```ts
interface BetSnapshot {
  id: string;
  playerId: string;
  amountCents: number;
  status: "pending" | "cashed_out" | "lost";
  cashoutMultiplierBps?: number;
  payoutCents?: number;
  autoCashoutMultiplierBps?: number;
  cashoutTrigger?: "manual" | "auto";
}
```

Null database values should serialize as omitted/undefined unless local API conventions prefer
explicit null.

## Migration Notes

- Migration is additive and Game-only.
- Existing bets do not require backfill.
- Existing `games-migrations` Compose service should apply the migration automatically.
- No changes are expected to `wallets-migrations`.

## Query/Projection Notes

- `GET /games/rounds/current` should include auto-cashout fields in bet snapshots.
- `GET /games/bets/me` should include auto-cashout fields in player bet snapshots.
- `GET /games/rounds/history` may include the fields if bets are part of the existing returned
  shape; if not, no history route shape expansion is required beyond player bet history.
- `GET /games/rounds/:roundId/verify` remains unchanged because auto-cashout does not affect crash
  generation.

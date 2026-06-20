# Data Model: Gameplay Foundation

## Game Database

### `rounds`

- `id`: stable round id.
- `status`: `betting`, `running`, `crashed`, `settled`.
- `betting_opens_at`, `betting_closes_at`, `started_at`, `crashed_at`, `settled_at`.
- `crash_multiplier_bps`: multiplier in basis points, set before run and revealed on crash. `10000`
  means `1.00x`.
- `house_edge_bps`: MVP house edge used by the crash formula. Defaults to `100`.
- `server_seed_hash`: commitment visible before the round starts.
- `server_seed`: revealed only after crash.
- `nonce`: deterministic round nonce/input for HMAC.
- `created_at`, `updated_at`.

### `bets`

- `id`: stable bet id.
- `round_id`: owning round.
- `player_id`: JWT subject-derived player id.
- `amount_cents`: integer cents.
- `status`: `pending`, `cashed_out`, `lost`.
- `cashout_multiplier_bps`: multiplier in basis points, nullable.
- `payout_cents`: integer cents, nullable until cashout.
- `wallet_operation_key`: idempotency key for wallet debit/reserve.
- `created_at`, `updated_at`.

Constraints:

- Unique accepted bet per `round_id` + `player_id`.
- Amount must be within min/max at domain level; DB may also enforce positive amount.

### `game_message_receipts`

Minimal idempotency tracking for wallet result messages consumed by Game.

- `idempotency_key`
- `message_type`
- `processed_at`

## Wallet Database

### `wallets`

- `id`: stable wallet id.
- `player_id`: unique player id.
- `balance_cents`: integer cents.
- `version`: optimistic concurrency/version field.
- `created_at`, `updated_at`.

Constraints:

- Unique `player_id`.
- `balance_cents >= 0`.

### `wallet_operations`

Ledger/idempotency table.

- `id`: stable operation id.
- `idempotency_key`: unique key from Game or Wallet use case.
- `wallet_id`
- `type`: `debit_bet`, `credit_payout`, `seed_credit`.
- `amount_cents`
- `status`: `accepted`, `rejected`.
- `reason`: nullable rejection reason.
- `source_round_id`: nullable.
- `source_bet_id`: nullable.
- `created_at`.

Constraints:

- Unique `idempotency_key`.
- Accepted debits cannot make wallet balance negative.

## Value Object Storage Rules

- `Money`: integer cents in persistence and DTO wire format unless a human display field is
  explicitly labeled as formatted text.
- `Multiplier`: integer basis points. `10000` means `1.00x`. Do not use JavaScript floating point
  for monetary payout calculation.
- `PlayerId`: string from authenticated JWT subject.
- `CrashPoint`: fixed-scale multiplier derived from provably fair data.
- Provably fair metadata: SHA-256 seed commitment, HMAC-SHA256 crash derivation, nonce, and
  `house_edge_bps` are stored or derivable for completed-round verification.

## MikroORM Boundary

MikroORM entities/mappings belong in `infrastructure/`. Domain entities may be separate classes from
MikroORM persistence entities if that keeps the domain free of ORM decorators and imports.

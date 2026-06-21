# Data Model: Persistence, Auth, and E2E Hardening

## Overview

This feature turns existing in-memory runtime state into durable PostgreSQL state. The domain model
does not become an ORM model. MikroORM entities remain infrastructure records mapped to and from
domain objects through repositories.

Money stays in integer cents. Multipliers stay in basis points where `10000` means `1.00x`.

## Game Database

### `rounds`

Purpose: durable record of active and completed crash rounds.

Required fields:

- `id`: stable round id.
- `status`: `betting`, `running`, `crashed`, or `settled`.
- `crash_multiplier_bps`: predetermined crash point.
- `house_edge_bps`: MVP default `100`.
- `server_seed_hash`: SHA-256 commitment visible before reveal.
- `server_seed`: nullable until reveal/completion.
- `nonce`: value used with server seed for HMAC-SHA256 crash derivation.
- `created_at`, `updated_at`.
- `crashed_at`: nullable until crash/reconciliation.
- `settled_at`: nullable until settlement.

Planning note:

- If active-round restart requires an explicit terminal status such as `reconciled`, update the
  domain lifecycle, contracts, docs, and migrations intentionally. Prefer using existing statuses if
  an explainable crashed/settled reconciliation can satisfy the spec.

### `bets`

Purpose: durable bets inside rounds, including player history and settlement outcome.

Required fields:

- `id`: stable bet id.
- `round_id`: owning round.
- `player_id`: stable player id from Keycloak JWT `sub` or explicit dev identity.
- `amount_cents`: integer cents.
- `status`: `pending`, `cashed_out`, or `lost`.
- `cashout_multiplier_bps`: nullable until cashout.
- `payout_cents`: nullable until cashout.
- `wallet_operation_key`: idempotency key for wallet debit.
- `created_at`, `updated_at`.

Constraints and indexes:

- One accepted bet per `round_id` + `player_id`.
- Index by `player_id` and recent `created_at`/round order for player history.
- Foreign key to `rounds`.

### `game_message_receipts`

Purpose: Game-side idempotency/reconciliation for wallet request/result handling.

Required fields:

- `idempotency_key`: primary key.
- `message_type`: debit request/result or payout request/result category.
- `processed_at`: processing timestamp.

Planning note:

- Use the current table before adding extra message tracking. Add fields only if retry tests prove
  result correlation cannot be handled with the existing key/type/timestamp shape.

## Wallet Database

### `wallets`

Purpose: durable player balance aggregate.

Required fields:

- `id`: stable wallet id.
- `player_id`: unique stable player id.
- `balance_cents`: integer cents, never negative.
- `version`: optimistic version or monotonic update counter.
- `created_at`, `updated_at`.

Constraints and indexes:

- Unique `player_id`.
- Balance must be non-negative. Prefer enforcing in domain and repository transaction; a database
  check constraint is useful if supported by current migration style.

### `wallet_operations`

Purpose: durable idempotency ledger for wallet effects.

Required fields:

- `id`: stable operation id.
- `idempotency_key`: unique key for duplicate-safe processing.
- `wallet_id`: owning wallet.
- `type`: `seed_credit`, `debit_bet`, or `credit_payout`.
- `amount_cents`: integer cents.
- `status`: `accepted` or `rejected`.
- `reason`: nullable rejection reason.
- `source_round_id`: nullable, set for bet/payout operations where available.
- `source_bet_id`: nullable, set for bet/payout operations where available.
- `created_at`.

Constraints and indexes:

- Unique `idempotency_key`.
- Index by `wallet_id` and `created_at`.
- Index by `source_round_id`/`source_bet_id` where useful for settlement debugging.

Idempotency behavior:

- First accepted `seed_credit`, `debit_bet`, or `credit_payout` applies the balance effect and
  records the operation.
- Duplicate key returns the previously recorded accepted/rejected result.
- Rejected duplicate returns the original rejection reason.
- Debit that would make balance negative records or returns a rejected outcome without mutating
  balance. The exact rejected-ledger behavior should be consistent and tested.

## Runtime State After Restart

Game restart:

- Active or interrupted rounds are loaded from `rounds`.
- Bets are loaded from `bets`.
- Completed verification data remains available through `rounds`.
- Unsettled crashed rounds can resume idempotent payout settlement.
- Running rounds that cannot be faithfully resumed are reconciled without deleting player-visible
  state.

Wallet restart:

- Wallet balance comes from `wallets`.
- Duplicate safety comes from `wallet_operations`.
- Seed balance is not re-applied when `seed_credit` already exists.

## Auth-Related Data

No new application table is planned for users in this feature.

Player identity source:

- Keycloak mode: JWT `sub`.
- Dev mode: explicit `x-player-id`, visibly labeled in UI.

The same `player_id` string is stored in Game and Wallet records. No domain object should depend on
Keycloak token structure beyond the application/presentation layer extracting that id.

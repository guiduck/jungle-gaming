# Data Model: Challenge Polish and Operational Confidence

## Overview

This feature does not introduce new product domain entities. Game and Wallet aggregates remain the
same: `Round`, `Bet`, `Wallet`, `WalletOperation`, `Money`, `CrashPoint`, and `PlayerId`.

The relevant data shapes are operational: script inputs/outputs, deterministic demo configuration,
smoke assertions, and lifecycle log fields. No database migration is planned by default.

## Demo Startup Result

Purpose: structured output from `npm run demo:up` for evaluator visibility.

Fields:

- `frontendUrl`: local frontend URL.
- `kongUrl`: local Kong base URL.
- `gamesSwaggerUrl`: direct Game Swagger URL.
- `walletsSwaggerUrl`: direct Wallet Swagger URL.
- `keycloakUrl`: local Keycloak URL.
- `gamesHealthUrl`: direct and/or Kong Game health URL.
- `walletsHealthUrl`: direct and/or Kong Wallet health URL.
- `demoUsername`: local challenge username.
- `demoPassword`: local challenge password.
- `realm`: Keycloak realm.
- `clientId`: Keycloak client id.
- `nextCommands`: suggested follow-up commands.

The output may be formatted as human-readable text, but the fields above should be obvious and
stable.

## Smoke Scenario State

Purpose: values tracked by `npm run smoke:api` to assert a deterministic gameplay path.

Fields:

- `playerId`: JWT `sub` or resolved demo player id.
- `walletId`: wallet id when available.
- `roundId`: deterministic or selected round id.
- `betId`: accepted bet id.
- `startingBalanceCents`: integer cents.
- `betAmountCents`: integer cents.
- `postBetBalanceCents`: integer cents after debit.
- `cashoutMultiplierBps`: optional known cashout multiplier.
- `crashMultiplierBps`: recorded crash multiplier.
- `payoutCents`: integer cents.
- `finalBalanceCents`: integer cents.
- `verificationMatched`: boolean.
- `seedCreditIdempotencyKey`: stable smoke setup key.
- `betDebitIdempotencyKey`: stable or observed wallet debit key.
- `payoutIdempotencyKey`: stable or observed payout key.

All monetary assertions must use integer cents. All multiplier assertions must use basis points.

## Demo Determinism Configuration

Purpose: allow repeatable local smoke without changing public gameplay semantics.

Potential fields:

- `enabled`: boolean; false by default outside explicit demo/test mode.
- `serverSeed`: optional deterministic server seed for next demo/test round.
- `nonce`: optional deterministic nonce.
- `expectedCrashMultiplierBps`: optional assertion target derived from seed and nonce.
- `scope`: `local-demo` or `test`.

Constraints:

- Must preserve SHA-256 commitment and HMAC-SHA256 derivation.
- Must not expose unrevealed seeds through public player-facing APIs.
- Must not let public users choose crash points.
- Must not mutate wallet balances directly.
- Must be disabled in normal player-facing runtime unless explicitly selected for smoke.

## Lifecycle Log Event

Purpose: stable fields for concise service logs.

Fields:

- `event`: stable event name, such as `round.started` or `wallet.debit.accepted`.
- `service`: `games`, `wallets`, `migrations`, or `demo`.
- `timestamp`: ISO timestamp or logger-provided timestamp.
- `roundId`: optional.
- `betId`: optional.
- `playerId`: optional; may be replaced by safe correlation id if needed.
- `idempotencyKey`: optional.
- `routingKey`: optional RabbitMQ routing key.
- `direction`: `publish`, `consume`, `request`, `result`, or similar.
- `amountCents`: optional integer cents.
- `multiplierBps`: optional basis points.
- `result`: optional result label.
- `reason`: optional rejection/failure reason.
- `durationMs`: optional duration.
- `authMode`: optional `keycloak` or `dev`.
- `persistenceAdapter`: optional `postgres` or `memory`.
- `walletEffectAdapter`: optional `rabbitmq`, `internal-http`, or `immediate`.

Forbidden values:

- Bearer tokens.
- Refresh tokens.
- Client secrets.
- Unrevealed server seeds.
- Passwords except explicit local demo credentials printed by `demo:up`.

## Browser Smoke Artifact

Purpose: optional browser validation evidence.

Fields:

- `viewport`: desktop or mobile dimensions.
- `artifactPath`: path under `output/playwright/`.
- `loginMode`: expected `keycloak`.
- `observedRoundId`: optional.
- `observedWalletBalanceCents`: optional.
- `webSocketStatus`: optional.
- `notes`: short manual or automated observation.

Browser artifacts are validation outputs, not product data. They should not be committed unless the
project later decides to keep curated screenshots.

# Contracts: Challenge Polish and Operational Confidence

## Public API Compatibility

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

- Keycloak mode remains the normal Docker/local auth mode.
- Public Wallet REST still does not expose arbitrary credit/debit endpoints.
- Bet acceptance still requires Wallet confirmation.
- Cashout and payout truth remain server-authoritative.

## Root Script Contracts

### `npm run demo:up`

Responsibilities:

- Verify Docker/Compose availability.
- Start or verify the Docker Compose stack.
- Wait for Game and Wallet migration services to complete or report already-latest/no-op state.
- Poll direct and Kong health endpoints.
- Poll frontend reachability.
- Account for Keycloak first-start warmup.
- Print demo URLs, credentials, and next commands.

Required output categories:

- `frontendUrl`
- `kongUrl`
- `gamesSwaggerUrl`
- `walletsSwaggerUrl`
- `keycloakUrl`
- `gamesHealthUrl`
- `walletsHealthUrl`
- `demoUsername`
- `demoPassword`
- `realm`
- `clientId`
- `nextCommands`

Failure behavior:

- Exit non-zero.
- Print failed step, expected condition, actual outcome, and a focused diagnostic command.

### `npm run smoke:api`

Responsibilities:

- Acquire a Keycloak token for the demo user.
- Verify Game and Wallet health.
- Create/read wallet.
- Verify idempotent seed/bootstrap behavior.
- Prepare or select deterministic round behavior.
- Place bet through Kong.
- Verify Wallet debit and Game accepted bet.
- Cash out at a known safe multiplier or verify deterministic crash loss.
- Verify wallet balance, round history, player bet history where useful, and provably fair
  verification recomputation.

Required pass summary:

- `playerId`
- `roundId`
- `betId`
- `startingBalanceCents`
- `finalBalanceCents`
- `betAmountCents`
- `cashoutMultiplierBps` or `crashMultiplierBps`
- `payoutCents`
- `verificationMatched`

Failure behavior:

- Exit non-zero.
- Print route/event involved, expected value, and actual value.

### `npm run smoke:browser`

Optional contract if implemented:

- Open frontend.
- Complete Keycloak PKCE login with local demo credentials.
- Confirm game UI reaches authenticated Keycloak mode.
- Verify wallet, round phase, controls, history, verification, and WebSocket status are visible.
- Capture artifacts under `output/playwright/` when useful.

If not implemented, docs must provide a manual PKCE checklist and explain that `npm run smoke:api`
is the required fast smoke.

## Demo/Test Configuration Contract

Any deterministic next-round or smoke harness configuration must be:

- Explicitly named as local demo/test behavior.
- Disabled in normal player-facing runtime.
- Documented in README or handoff.
- Protected from public arbitrary crash control and wallet mutation.
- Compatible with normal SHA-256 commitment and HMAC-SHA256 crash derivation.

Suggested configuration shape:

- `DEMO_DETERMINISTIC_ROUNDS=true|false`
- Optional seed/nonce inputs only if the plan proves they are safer than an application harness.

## Log Event Contract

Logs should be single-line and consistently shaped. JSON is acceptable but not required. Stable
field names are preferred.

Common fields:

- `event`
- `service`
- `timestamp`
- `roundId`
- `betId`
- `playerId` or safe correlation id
- `idempotencyKey`
- `routingKey`
- `direction`
- `amountCents`
- `multiplierBps`
- `result`
- `reason`
- `durationMs`
- `authMode`
- `persistenceAdapter`
- `walletEffectAdapter`

Forbidden log values:

- Bearer tokens.
- Refresh tokens.
- Client secrets.
- Passwords except printed local demo credentials in explicit demo startup output.
- Unrevealed server seeds.
- Full private Keycloak material.

Required event categories:

- Game startup mode.
- Game restart reconciliation summary.
- Round betting opened.
- Round started.
- Round crashed.
- Round settled.
- Wallet debit requested/result.
- Wallet payout requested/result.
- Wallet seed credit.
- Wallet duplicate idempotency outcome.
- RabbitMQ publish/consume.
- Migration startup/result.
- Auth mode and auth rejection reason.

## Existing RabbitMQ Contract

Existing wallet-effect events remain compatible:

- `wallet.bet_debit_requested`
- `wallet.payout_credit_requested`
- `wallet.bet_debit_accepted`
- `wallet.bet_debit_rejected`
- `wallet.payout_credit_accepted`
- `wallet.payout_credit_rejected`

Demo and smoke tooling must not bypass RabbitMQ in the normal Docker/local profile unless an
explicit documented dev/smoke mode is intentionally selected.

## Existing WebSocket Contract

WebSocket remains server-to-client projection. Player actions remain REST.

Existing event categories remain compatible:

- `round.betting_opened`
- `round.started`
- `round.multiplier`
- `round.crashed`
- `round.settled`
- `bet.accepted`
- `cashout.accepted`
- `cashout.rejected`
- `history.updated`

Smoke tooling may listen to WebSocket events for confidence, but authoritative assertions should
come from API snapshots and server results where practical.

## Documentation Contract

README and handoff must include:

- PowerShell examples where environment syntax differs.
- Bash examples where environment syntax differs.
- Keycloak first-start timing notes.
- Docker Desktop/Compose diagnostics.
- Fast smoke command and expected summary.
- Optional browser smoke or manual PKCE checklist.
- Service tests, frontend tests, and full validation commands.

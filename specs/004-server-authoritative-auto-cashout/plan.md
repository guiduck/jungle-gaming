# Implementation Plan: Server-Authoritative Auto-Cashout

**Spec**: `specs/004-server-authoritative-auto-cashout/spec.md`  
**Branch**: `004-server-authoritative-auto-cashout`  
**Date**: 2026-06-21  
**Status**: Planned for `/speckit-tasks`

## Summary

Add auto-cashout as a small, additive Phase 4 product differentiator. The implementation should let
players attach an optional `autoCashoutMultiplierBps` target to a bet, persist that target with the
bet, and let the Game Service cash out the bet automatically when the authoritative running
multiplier crosses the target before crash.

The plan preserves the completed foundation:

- Game remains server-authoritative for round, cashout, history, and verification truth.
- Wallet remains authoritative for balances and idempotent payout credits.
- Money stays integer cents and multiplier basis points.
- Bet debit and payout credit effects still use RabbitMQ in the Docker/local profile.
- Keycloak remains the normal auth path.
- `bun run docker:up`, `npm run demo:up`, and `npm run smoke:api` remain valid.

## Technical Context

- Backend: NestJS services in `services/games` and `services/wallets`.
- Game domain: `Round` owns lifecycle and bet transitions; `Bet` owns pending/cashed-out/lost
  state and payout calculation.
- Runtime runner: `RoundRunnerService` advances the in-process local round loop.
- Persistence: Game `bets` are stored through MikroORM/PostgreSQL.
- Messaging: Wallet payout credits use `wallet.payout_credit_requested` and existing
  `payout-credit:{roundId}:{betId}` idempotency.
- Frontend: Vite React with TanStack Query for server snapshots and Zustand for hot projection.

## Architecture Goals

- Keep auto-cashout as an extension of existing bet/cashout behavior, not a second settlement
  system.
- Put validation and invariant behavior in Game domain/application layers, not controllers or
  frontend code.
- Add nullable persisted fields for backward compatibility with existing bets.
- Avoid changes to Wallet public routes, Wallet money rules, crash-point generation, and
  provably-fair verification.
- Keep the UI control compact and embedded in the existing bet panel rather than redesigning the
  screen.

## Implementation Strategy

### 1. Domain Model Extension

Extend `BetSnapshot` with:

- `autoCashoutMultiplierBps?: number`
- `cashoutTrigger?: "manual" | "auto"`

Add a small domain value or validation helper for auto-cashout target bounds:

- Minimum: `11000` bps (`1.10x`)
- Maximum: `1000000` bps (`100.00x`)
- Integer basis points only
- Undefined means disabled

Update `Bet.create(...)` and `Round.placeBet(...)` to accept the optional target. Keep the existing
amount validation unchanged.

Update `Bet.cashOut(...)` to accept a trigger, defaulting to `manual` for existing manual calls.
When cashout succeeds, persist both `cashoutMultiplierBps` and `cashoutTrigger`.

Add a domain method for automatic cashout that only operates on pending bets with a configured
target. The cleanest shape is likely on `Round`, for example:

```ts
autoCashOutEligibleBets(currentMultiplierBps: number): AutoCashoutResult[]
```

or an equivalent direct method that:

- only runs while the round is `running`
- requires `autoCashoutMultiplierBps < crashMultiplierBps`
- cashes out at exactly the configured target
- ignores already cashed-out or lost bets
- returns enough data for application events and payout logging

Do not use the displayed frontend multiplier as payout truth.

### 2. Application Service Changes

Update `GameStateService.placeBet(...)` to accept `autoCashoutMultiplierBps?: number | null`.
Validation must occur before `requestBetDebit(...)` so invalid targets do not debit Wallet.

Add an application method used by the runner before multiplier publish/crash, for example:

```ts
evaluateAutoCashouts(currentMultiplierBps: number): Promise<RoundSnapshot>
```

This method should:

- load the current round
- no-op unless status is `running`
- transition all eligible pending bets once
- save the round before publishing events
- publish `cashout.accepted` for each auto-cashed-out bet with `cashoutTrigger: "auto"`
- rely on existing crash/settlement payout flow for Wallet payout requests

Keep payout credit request timing in the current settlement path unless implementation proves an
immediate payout request is simpler and equally idempotent. The current code already requests
payouts for all `cashed_out` bets during crash/reconciliation with stable per-bet idempotency.

Manual cashout should call the same cashout invariant path with `cashoutTrigger: "manual"`. If the
bet is already auto-cashed-out, it should keep the current safe domain rejection behavior.

### 3. Runner Ordering

Update `RoundRunnerService` running-phase tick order:

1. Compute the next authoritative running multiplier, capped by `crashMultiplierBps`.
2. Before publishing that visible tick, call `evaluateAutoCashouts(nextMultiplierBps)`.
3. Publish the multiplier tick.
4. If `nextMultiplierBps >= crashMultiplierBps`, crash the round.

Because `Round` only auto-cashes out targets strictly below the crash point, equality still loses.
This keeps crash-boundary behavior deterministic and testable.

### 4. Persistence and Migration

Add nullable columns to the Game `bets` table:

- `auto_cashout_multiplier_bps integer null`
- `cashout_trigger text null`

Update:

- MikroORM `BetEntity`
- `betSchema`
- `MikroOrmRoundRepository` mapping to/from domain snapshots
- in-memory repository snapshots if needed by tests

Existing rows must keep null values. No Wallet migration is planned.

The migration should be additive and repeatable through existing `games-migrations`. The normal
Compose migration ordering remains unchanged.

### 5. REST, Swagger, and Contracts

Update `PlaceBetRequestDto`:

- Add optional nullable `autoCashoutMultiplierBps`
- Swagger example/min/max should reflect `11000` and `1000000`
- Controller integer validation should validate the field only when present and non-null

Keep route shape unchanged: `POST /games/bet`.

Response snapshots can add fields to bet objects:

- `autoCashoutMultiplierBps`
- `cashoutTrigger`

Existing clients that ignore unknown fields stay compatible.

Update `packages/contracts` only where shared socket or event payload typing exists. Do not add new
RabbitMQ routing keys for auto-cashout.

### 6. WebSocket Events

Reuse existing `cashout.accepted` rather than introducing a new socket event.

Add optional payload fields:

- `betId`
- `cashoutTrigger: "manual" | "auto"`
- `autoCashoutMultiplierBps` when relevant
- existing `roundId`, `playerId`, `multiplierBps`, `payoutCents`

Existing frontend invalidation on `cashout.accepted` should continue to work. The extra fields let
the UI show that the result was automatic.

### 7. Frontend UI

Keep the UI change scoped to the existing bet controls and bet/history displays.

Add local form state in `frontend/src/App.tsx` or a small extracted component:

- auto-cashout enabled toggle
- multiplier input or stepper constrained to `1.10x` through `100.00x`
- convert display multiplier to integer basis points before API submit

Update `frontend/src/services/api.ts`:

- `placeBet(amountCents, autoCashoutMultiplierBps?)`
- send `autoCashoutMultiplierBps` only when enabled or send null intentionally

Update `frontend/src/types.ts`:

- optional `autoCashoutMultiplierBps`
- optional `cashoutTrigger`

Update current bet, current bets, and my bets displays with concise status text. Do not add a large
new panel or landing-style explanation. The goat/mountain scene remains presentation-only.

### 8. Tests

Game domain/unit tests should cover:

- valid and invalid auto-cashout target bounds
- absent/null target preserves manual-only behavior
- auto-cashout at target below crash records target and payout
- target equal to crash loses
- manual before target prevents later auto-cashout
- auto before manual prevents double cashout
- payout uses `Money.multiplyByMultiplierBps`

Game e2e/application tests should cover:

- invalid target rejects before wallet debit
- accepted bet persists target through repository mapping
- runner/application evaluation auto-cashes out before crash
- restart reconciliation replays payout for an auto-cashed-out bet idempotently
- player bet/history snapshots include target and trigger

Wallet tests should not need new behavior, but existing payout idempotency tests should remain part
of validation. Add a Game-level assertion that auto/manual races still produce one payout request
key: `payout-credit:{roundId}:{betId}`.

Frontend tests should cover:

- API payload formatting for enabled/disabled auto-cashout
- form validation or formatting helper for basis-point conversion
- telemetry/log output still avoids secrets if new fields are logged

### 9. Smoke and Operations

`npm run smoke:api` must continue to pass without specifying auto-cashout. If the implementation
adds auto-cashout smoke assertions, keep them additive and deterministic.

Lifecycle logs may add concise auto-cashout events through the existing log helper:

- `cashout.auto.accepted`
- fields: `roundId`, `betId`, `playerId`, `multiplierBps`, `payoutCents`, `cashoutTrigger`

Do not add monitoring infrastructure.

### 10. Documentation Closeout

Implementation must update affected docs plus:

- `README.md`: player-facing auto-cashout note and any changed validation commands.
- `docs/domain-model.md`: `Bet` optional auto-cashout target and `cashoutTrigger`.
- `docs/architecture.md`: if runner ordering or socket payload behavior needs an operational note.
- `docs/architecture-decisions.md`: add an ADR only if implementation chooses a meaningful trade-off
  beyond this plan, such as immediate payout requests instead of settlement-time payout requests.
- `docs/handoff.md`: implementation status, validation, residual risks.
- `docs/roadmap.md`: Phase 4 progress.
- `docs/next-spec-prompt.md`: next recommended Spec Kit prompt after auto-cashout.

## Data Model Plan

See `data-model.md` for entity and schema details.

## Contract Plan

See `contracts.md` for REST, WebSocket, RabbitMQ, and frontend API contract details.

## Validation Plan

Required validation before implementation closeout:

- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `docker compose run --rm games bun test tests/unit`
- `docker compose run --rm games bun test tests/e2e`
- `docker compose run --rm wallets bun test tests/unit`
- `docker compose run --rm wallets bun test tests/e2e`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- `docker compose config --quiet`
- `npm run demo:up`
- `npm run smoke:api`
- Domain boundary search for forbidden framework/ORM/messaging/controller/DTO imports in domain
  folders.
- Money arithmetic search confirming wallet balances, bet amounts, debits, credits, and payouts
  remain integer cents and multiplier basis points.

Optional validation:

- Manual browser PKCE checklist from README after the UI control is added.
- Desktop/mobile screenshot check if the bet controls become crowded.

If Docker Desktop, Keycloak warmup, or browser tooling blocks validation, closeout must state the
exact command, observed failure, and remaining local verification step.

## Risks and Mitigations

- **Cashout race can double-pay**: use one domain transition per bet and stable
  `payout-credit:{roundId}:{betId}` idempotency.
- **Boundary behavior can be ambiguous**: enforce target strictly below crash; equality loses.
- **Runner tick order can leak UI truth into payouts**: evaluate from authoritative server multiplier
  and record the configured target, not the displayed client value.
- **Invalid target could debit Wallet**: validate target before `requestBetDebit(...)`.
- **Migration can break existing rows**: use nullable columns and default old bets to disabled
  auto-cashout.
- **UI can become busy**: keep the toggle/input inside existing controls and avoid new panels.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review.
2. Domain target validation and snapshot updates.
3. Application `placeBet` and manual/auto cashout transition support.
4. Runner auto-cashout evaluation ordering.
5. MikroORM entity/schema/migration/repository mapping.
6. REST DTO, Swagger, and controller validation.
7. Shared/frontend contract type updates.
8. Frontend bet-control UI and API payload changes.
9. Domain, application/e2e, frontend, and migration validation tests.
10. Demo/smoke compatibility check.
11. Documentation closeout.

Avoid tasks for live target editing, auto-bet, leaderboard, browser PKCE automation, final artwork,
monitoring infrastructure, or multi-instance runner coordination.

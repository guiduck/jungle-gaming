# Data Model: CI/CD and Browser Auth Smoke

## Overview

This feature does not introduce product domain entities or persistence.

Unchanged domain entities:

- `Round`
- `Bet`
- `Wallet`
- `WalletOperation`
- `Money`
- `CrashPoint`
- `PlayerId`

Relevant data shapes are operational:

- CI job definitions and command results.
- Browser smoke checkpoints.
- Service readiness probes.
- Failure diagnostics and screenshots.
- Optional non-visual selector hooks.

No database migration, RabbitMQ schema change, WebSocket payload change, Wallet ledger state, Game
aggregate field, or persisted frontend setting is planned.

## CI Workflow Result

Purpose: represent the required GitHub Actions validation surface.

Fields:

- `workflowName`: suggested `CI`.
- `trigger`: `push` or `pull_request`.
- `jobName`: `frontend`, `services`, or `compose-config`.
- `runtime`: Node.js, Bun, Docker Compose, or a combination.
- `commands`: ordered command list.
- `status`: `success` or `failure`.
- `failureStep`: optional command or setup step.
- `notes`: optional reproducibility guidance.

Expected jobs:

- `frontend`: TypeScript, Vitest, Vite build.
- `services`: TypeScript, Games unit/e2e, Wallets unit/e2e.
- `compose-config`: Docker Compose config rendering.

## Browser Smoke Scenario

Purpose: track the high-level local browser-auth validation path.

Fields:

- `frontendUrl`: default `http://localhost:3000`.
- `keycloakUrl`: default `http://localhost:8080`.
- `kongUrl`: default `http://localhost:8000`.
- `username`: local demo username, `player`.
- `password`: local demo password, `player123`.
- `browser`: `chromium`.
- `context`: `fresh-non-persistent`.
- `startedAt`: timestamp.
- `completedAt`: optional timestamp.
- `status`: `passed` or `failed`.
- `failedPhase`: optional browser smoke phase.

Constraints:

- Password may be used to fill the Keycloak form but must not be printed in diagnostics.
- Tokens, authorization codes, PKCE verifier/challenge values, and raw local storage must not be
  captured in outputs.

## Readiness Probe Result

Purpose: represent a bounded preflight check before browser automation continues.

Fields:

- `label`: human-readable service name, such as `frontend`, `keycloak`, `kong`, `games`, or
  `wallets`.
- `url`: checked URL.
- `attempt`: current attempt number.
- `maxAttempts`: bounded retry count.
- `timeoutMs`: per-attempt or total timeout.
- `statusCode`: optional HTTP status.
- `ok`: boolean.
- `error`: optional short error message.

Expected behavior:

- Retry Keycloak readiness because first boot can be slow.
- Fail with clear diagnostics when the timeout is exhausted.
- Do not spin indefinitely.

## Browser Checkpoint

Purpose: represent each smoke assertion in a stable way.

Fields:

- `name`: stable checkpoint name.
- `phase`: `pre-auth`, `keycloak`, `post-auth`, or `diagnostic`.
- `selector`: optional role/text/test-hook selector description.
- `expected`: short expected condition.
- `observed`: optional short observed condition.
- `required`: boolean.
- `status`: `passed`, `failed`, or `skipped`.

Required checkpoint names:

- `clean-context`
- `frontend-loaded`
- `login-required-visible`
- `keycloak-entry-visible`
- `keycloak-ready`
- `keycloak-login-page`
- `keycloak-credentials-submitted`
- `frontend-callback-complete`
- `authenticated-shell`
- `wallet-visible`
- `round-phase-visible`
- `mountain-scene-visible`
- `betting-controls-visible`
- `current-bets-visible`
- `leaderboard-visible`
- `history-visible`
- `my-bets-visible`
- `verification-visible`
- `websocket-status-visible`
- `show-commands-visible`

## Failure Artifact

Purpose: record enough evidence to debug a smoke failure without leaking secrets.

Fields:

- `phase`: failed phase.
- `message`: concise failure message.
- `currentUrl`: optional browser URL.
- `screenshotPath`: optional path under `output/playwright/`.
- `suggestedCommands`: diagnostic commands.
- `capturedAt`: timestamp.

Allowed artifact paths:

- `output/playwright/browser-smoke-*.png`
- `output/playwright/browser-smoke-*.txt`

Forbidden artifact contents:

- bearer tokens
- refresh tokens
- authorization codes
- PKCE verifier/challenge values
- passwords
- client secrets
- raw local storage dumps
- default Playwright traces containing credential entry

## Frontend Smoke Hook

Purpose: provide stable non-visual selectors when accessible roles or localized labels are too
brittle for the smoke script.

Fields:

- `attribute`: `data-smoke` or `data-testid`.
- `value`: stable kebab-case identifier.
- `ownerComponent`: existing React component that renders the visible UI.
- `visibleBehaviorChanged`: must be `false`.
- `sensitiveDataExposed`: must be `false`.

Suggested values:

- `login-required-modal`
- `wallet-display`
- `round-phase`
- `mountain-scene`
- `betting-controls`
- `current-bets`
- `leaderboard-panel`
- `history-panel`
- `my-bets-panel`
- `verification-panel`
- `websocket-status`

## Package Script Addition

Purpose: additive root command for local browser auth smoke.

Fields:

- `name`: `smoke:browser`.
- `command`: `node scripts/smoke-browser.cjs`.
- `precondition`: `npm run demo:up` already completed successfully.
- `sideEffects`: launches browser, writes optional diagnostics under `output/playwright/`.
- `forbiddenSideEffects`: start/stop/reset/prune Docker resources, modify Keycloak realm security,
  write tokens to source files, commit browser artifacts.

## Documentation State

Purpose: closeout locations that must be synchronized after implementation.

Fields:

- `README.md`: commands, CI summary, Playwright install, troubleshooting.
- `docs/handoff.md`: status, validation, blocked checks, residual risks.
- `docs/roadmap.md`: Phase 4.5 progress and Phase 5 next step.
- `docs/next-spec-prompt.md`: prompt for `008-release-readiness-closeout`.
- `docs/architecture.md`: update only if operational architecture materially changes.
- `docs/architecture-decisions.md`: update only if implementation chooses a meaningful trade-off
  beyond the plan.

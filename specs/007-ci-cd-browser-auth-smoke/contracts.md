# Contracts: CI/CD and Browser Auth Smoke

## Compatibility Summary

This feature is additive and operational.

Unchanged:

- `npm run demo:up` meaning and expected local-stack behavior.
- `npm run smoke:api` meaning and deterministic API smoke scope.
- Game REST write routes:
  - `POST /games/bet`
  - `POST /games/bet/cashout`
- Game REST read routes:
  - `GET /games/rounds/current`
  - `GET /games/rounds/history`
  - `GET /games/rounds/:roundId/verify`
  - `GET /games/leaderboard`
  - `GET /games/bets/me`
- Wallet REST routes:
  - `POST /wallets`
  - `GET /wallets/me`
- RabbitMQ wallet request/result events.
- WebSocket event names and payload contracts.
- Keycloak-first browser authorization-code/PKCE model.
- Integer cents, multiplier basis points, SHA-256/HMAC-SHA256 verification semantics.

Added:

- GitHub Actions CI workflow.
- Root `npm run smoke:browser` command.
- Playwright/Chromium browser-smoke tooling and documentation.
- Optional non-visual frontend smoke selector hooks.

## GitHub Actions Contract

Workflow location:

- `.github/workflows/ci.yml`

Triggers:

- `push`
- `pull_request`

Required jobs:

- `frontend`
- `services`
- `compose-config`

### `frontend` Job

Required commands:

```bash
npx tsc -p frontend/tsconfig.json --noEmit
npm --workspace frontend run test
npm --workspace frontend run build
```

Expected behavior:

- Fails on TypeScript errors.
- Fails on Vitest failures.
- Fails on Vite production build errors.
- Does not require Docker Compose or Keycloak.

### `services` Job

Required commands:

```bash
npx tsc -p services/games/tsconfig.json --noEmit
npx tsc -p services/wallets/tsconfig.json --noEmit
npm --workspace @crash/games run test
npm --workspace @crash/games run test:e2e
npm --workspace @crash/wallets run test
npm --workspace @crash/wallets run test:e2e
```

Expected behavior:

- Installs Bun before service tests.
- Runs existing package scripts without requiring full Docker Compose boot.
- Does not start Keycloak, PostgreSQL, RabbitMQ, Kong, Games, Wallets, or Frontend containers.

### `compose-config` Job

Required command:

```bash
docker compose config --quiet
```

Expected behavior:

- Validates Compose syntax/rendering from tracked files.
- Does not run the full stack.
- Does not require local `.env` files beyond tracked defaults already used by the project.

### Optional Jobs

Allowed but not required:

- bounded Docker image build checks
- manual `workflow_dispatch` full-stack experiment

Constraints:

- Optional jobs must be clearly named.
- Optional jobs must not hide failures in the required fast CI signal.
- Browser Keycloak smoke must not be required on push/pull request CI.

## Root Script Contract

### `npm run smoke:browser`

Command:

```bash
npm run smoke:browser
```

Expected implementation:

```json
"smoke:browser": "node scripts/smoke-browser.cjs"
```

Precondition:

- `npm run demo:up` has already started or verified the local Docker Compose stack.

Responsibilities:

- Verify frontend reachability.
- Verify Keycloak/OIDC reachability with bounded retry.
- Verify enough API/Kong health to make browser smoke meaningful.
- Launch a fresh non-persistent Chromium browser context.
- Open `http://localhost:3000`.
- Prove the public unauthenticated welcome state appears with no `jungle.accessToken`.
- Follow the normal frontend Keycloak login entry point.
- Log in through real Keycloak using local demo credentials `player` / `player123`.
- Wait for redirect/callback back to the frontend.
- Verify the authenticated game shell.
- Exit non-zero with actionable diagnostics when any required checkpoint fails.

Forbidden behavior:

- Do not start Docker Compose.
- Do not stop, kill, prune, or reset Docker resources.
- Do not inject bearer tokens into local storage.
- Do not call a password-grant token shortcut instead of the browser PKCE flow.
- Do not add or call public test-only auth endpoints.
- Do not weaken Keycloak realm or client configuration.

## Browser Checkpoint Contract

### Pre-Auth Checkpoints

Required:

- Clean browser context.
- Frontend page loads.
- No pre-existing `jungle.accessToken` is used.
- Login-required modal or pre-login shell appears.
- Keycloak login entry point is available.

### Keycloak Checkpoints

Required:

- Keycloak public URL or OIDC discovery endpoint becomes reachable within a bounded timeout.
- Browser reaches the Keycloak login page.
- Username field accepts `player`.
- Password field accepts `player123`.
- Submit returns the browser to the frontend through the normal redirect/callback path.
- Script does not print or persist tokens, authorization codes, PKCE verifiers, or passwords.

### Authenticated Shell Checkpoints

Required representative assertions:

- Authenticated identity/session signal is visible.
- Wallet display is visible.
- Round phase/status is visible.
- Mountain/goat scene is visible.
- Betting controls are visible.
- Current bets panel is visible.
- Leaderboard panel is visible.
- History panel is visible.
- My bets panel is visible.
- Verification panel is visible.
- WebSocket status is connected or a clear WebSocket-specific diagnostic is emitted.
- `Show commands` entry point is visible.

Selectors:

- Prefer accessible roles and stable labels.
- Account for Brazilian Portuguese player-facing text.
- Use `data-smoke` or `data-testid` only where roles/text are too brittle.

## Diagnostic Contract

Failure output should include:

- failed phase
- expected condition
- actual condition
- current URL when a browser page exists
- service URL that failed readiness when relevant
- suggested diagnostic commands
- screenshot path when captured

Suggested diagnostic commands:

```bash
docker compose ps
docker compose logs --tail 120 keycloak
docker compose logs --tail 120 frontend
docker compose logs --tail 120 games
docker compose logs --tail 120 wallets
npm run demo:up
```

Forbidden diagnostic output:

- bearer tokens
- refresh tokens
- authorization codes
- PKCE verifier/challenge values
- passwords
- client secrets
- raw local storage dumps
- Playwright traces that capture secret entry by default

Allowed artifacts:

- screenshots under `output/playwright/`
- concise text diagnostics

## Frontend Smoke Hook Contract

Allowed:

```tsx
data-smoke="public-welcome"
data-smoke="welcome-modal"
data-smoke="login-required-modal"
data-smoke="wallet-display"
data-smoke="round-phase"
data-smoke="mountain-scene"
data-smoke="betting-controls"
data-smoke="current-bets"
data-smoke="leaderboard-panel"
data-smoke="history-panel"
data-smoke="my-bets-panel"
data-smoke="verification-panel"
data-smoke="websocket-status"
```

Constraints:

- Hooks must be non-visual.
- Hooks must not change layout, copy, behavior, or accessibility names.
- Hooks must not expose secrets or additional product data.
- Hooks must not add new controls.

## Public API and Messaging Contracts

No public API, WebSocket, or RabbitMQ contract changes are planned.

Browser smoke may observe existing API and WebSocket behavior, but authoritative gameplay and money
assertions remain server-owned and continue to be covered by existing API/service tests.

## Documentation Contract

README and closeout docs must include:

- required CI checks and what they intentionally omit
- `npm run smoke:browser` usage
- `npm run demo:up` precondition
- Playwright/Chromium install or cache expectations
- Docker Desktop and Keycloak reachability troubleshooting
- reminder that browser smoke uses real Keycloak PKCE and does not weaken auth
- final validation commands run and any blocked validation

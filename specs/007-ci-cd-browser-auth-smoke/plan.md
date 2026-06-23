# Implementation Plan: CI/CD and Browser Auth Smoke

**Spec**: `specs/007-ci-cd-browser-auth-smoke/spec.md`  
**Branch**: `007-ci-cd-browser-auth-smoke`  
**Date**: 2026-06-22  
**Status**: Implemented

## Summary

Add a focused GitHub Actions validation pipeline and an additive local Playwright browser smoke for
the real Keycloak authorization-code/PKCE login path.

The plan keeps the repository self-checking without weakening the challenge delivery model:

- Required CI runs fast typecheck, unit/e2e test, frontend build, and Compose config validation.
- Required CI does not boot the full Docker Compose stack and does not run browser Keycloak smoke.
- `npm run smoke:browser` runs locally after `npm run demo:up` and validates the real browser auth
  flow plus representative authenticated game-shell content.
- `npm run demo:up` and `npm run smoke:api` keep their current meaning.
- Game, Wallet, RabbitMQ, PostgreSQL, Kong, Keycloak realm security, crash math, settlement, public
  REST/WebSocket contracts, and money rules remain unchanged.

## Technical Context

- Root workspace scripts live in `package.json`.
- Frontend package: `frontend/package.json`
  - `build`: `tsc -b && vite build`
  - `test`: `vitest run`
- Games package: `services/games/package.json`
  - `test`: `bun test tests/unit`
  - `test:e2e`: `bun test tests/e2e`
- Wallets package: `services/wallets/package.json`
  - `test`: `bun test tests/unit`
  - `test:e2e`: `bun test tests/e2e`
- Typecheck is currently run directly with:
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- Local delivery remains Docker Compose with PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets,
  and Frontend.
- Browser smoke should use Playwright/Chromium and produce artifacts under `output/playwright/`
  only when useful for diagnostics.
- The UI is currently Brazilian Portuguese for player-facing labels, with `Show commands` preserved
  as the intentional command entry point.

## Architecture Goals

- Keep CI as a fast, reproducible quality gate for code and configuration.
- Keep full-stack browser auth smoke as local validation by default because it depends on Docker
  Desktop, Keycloak warmup, browser binaries, and a live Compose stack.
- Keep browser smoke outside application security boundaries: no public test auth endpoint, no
  password bypass, no pre-seeded bearer token, and no weakened Keycloak client/realm config.
- Keep selector support non-invasive. Stable `data-testid`/`data-smoke` attributes are acceptable
  only where accessible roles/text are too brittle.
- Keep smoke scripts transparent: clear readiness phases, bounded retries, non-zero failure exits,
  and diagnostics that avoid secrets.
- Keep domain boundaries clean. This feature should not touch Game/Wallet domain logic except to
  run existing tests.

## Implementation Strategy

### 1. GitHub Actions Workflow

Add a workflow under `.github/workflows/`, for example `.github/workflows/ci.yml`.

Triggers:

- `push`
- `pull_request`

Recommended job structure:

- `frontend`
  - checkout
  - setup Node.js
  - install dependencies with `npm ci`
  - run `npx tsc -p frontend/tsconfig.json --noEmit`
  - run `npm --workspace frontend run test`
  - run `npm --workspace frontend run build`
- `services`
  - checkout
  - setup Node.js
  - setup Bun
  - install dependencies with `npm ci`
  - run `npx tsc -p services/games/tsconfig.json --noEmit`
  - run `npx tsc -p services/wallets/tsconfig.json --noEmit`
  - run `npm --workspace @crash/games run test`
  - run `npm --workspace @crash/games run test:e2e`
  - run `npm --workspace @crash/wallets run test`
  - run `npm --workspace @crash/wallets run test:e2e`
- `compose-config`
  - checkout
  - run `docker compose config --quiet`

Planning notes:

- Prefer `npm ci` in CI because the repository has a lockfile and npm workspaces.
- Use official setup actions such as `actions/setup-node` and `oven-sh/setup-bun`.
- Do not require database services for unit/e2e package scripts unless implementation discovers
  those tests actually need external dependencies. The current package scripts are expected to be
  focused and runnable without full Compose boot.
- If `docker compose config --quiet` is noisy because of local-only warnings, keep the command but
  document the expected behavior and adjust only if CI proves the warning is fatal.
- Docker image builds are optional. If added, use a separately named bounded job or manual
  `workflow_dispatch` path so image build time does not hide the fast CI signal.
- Do not add required `npm run demo:up` or `npm run smoke:browser` to push/PR CI.

### 2. Root Browser Smoke Command

Add a root script:

```json
"smoke:browser": "node scripts/smoke-browser.cjs"
```

The script should be a readable Node entry point under `scripts/`, not a long inline command in
`package.json`.

Responsibilities:

- Verify basic prerequisites:
  - Node/npm are available by virtue of running the script.
  - Playwright can be resolved or provide a clear install instruction.
  - The frontend URL is reachable.
  - Keycloak/OIDC discovery or login surface is reachable.
  - Kong/direct API health surfaces are reachable enough to start browser smoke.
- Explain that `npm run demo:up` should run first.
- Launch a clean non-persistent Chromium context.
- Navigate to `http://localhost:3000`.
- Confirm the public unauthenticated welcome state appears with no `jungle.accessToken`.
- Start the Keycloak login through the normal frontend flow.
- Fill Keycloak username/password with local demo credentials `player` / `player123`.
- Wait for the redirect/callback to return to the frontend.
- Confirm the authenticated shell through representative selectors.
- Exit `0` only when the required checkpoints pass.

Do not make the script start, reset, prune, or rebuild Docker resources. It may print suggested
commands such as `npm run demo:up`, `docker compose ps`, and
`docker compose logs --tail 120 keycloak`.

### 3. Playwright Dependency Strategy

Preferred approach:

- Add `@playwright/test` or `playwright` as a root dev dependency if the implementation uses the
  Playwright Node API from `scripts/smoke-browser.cjs`.
- Use the standard Playwright browser install flow, such as `npx playwright install chromium`, and
  document it.
- Do not commit browser binaries, traces, or generated screenshots.

Alternative acceptable approach:

- Use the CLI wrapper pattern documented in the local Playwright skill for ad hoc validation, but
  the project command should remain a stable root `npm run smoke:browser`.

The implementation should choose the simplest durable approach. Because this is a repo command, a
small Node script using the Playwright API is likely clearer than shelling out to multiple CLI
commands.

### 4. Browser Smoke Checkpoints

Pre-auth checkpoints:

- Clean context has no app token state.
- Frontend loads.
- Login-required modal or pre-login shell is visible.
- Keycloak button or redirect entry point is available.

Keycloak checkpoints:

- Keycloak URL/OIDC discovery responds before login attempt.
- Login page appears after redirect.
- Username and password fields can be filled.
- Login submit leads back to the frontend.
- The script never injects tokens into storage and never reads or prints authorization codes.

Authenticated shell checkpoints:

- Session/identity signal shows Keycloak/authenticated mode.
- Wallet display is visible.
- Round phase/status is visible.
- Mountain/goat scene is visible.
- Betting controls are visible.
- Current bets panel is visible.
- Leaderboard/history/my-bets/verification panels are visible.
- WebSocket status is connected or a useful fallback diagnostic is reported.
- `Show commands` entry point remains visible as the intentional English exception.

Selector strategy:

- Prefer accessible roles and stable visible labels where they are already reliable.
- Use localized Brazilian Portuguese text for player-facing labels.
- Add `data-smoke` or `data-testid` attributes only where text/roles are too fragile.
- Do not change visible text solely for automation.
- Do not add hidden buttons, dev identity controls, auth shortcuts, or gameplay controls.

### 5. Diagnostics and Failure Artifacts

The browser smoke should use small helper functions for phases such as:

- `checkUrl(url, label, timeoutMs)`
- `waitForKeycloakReady()`
- `captureFailureArtifact(page, stepName)`
- `failWithDiagnostics(message, details)`

Failure output should include:

- Failed phase.
- Expected condition.
- Current URL when a browser page exists.
- Suggested next diagnostic commands.
- Path to screenshot artifact when captured.

Failure output must not include:

- Bearer tokens.
- Authorization codes.
- PKCE verifier/challenge values.
- Passwords.
- Raw local storage dumps.
- Playwright traces that capture credential entry by default.

Screenshots may be stored under `output/playwright/` with names such as
`browser-smoke-failure-login.png`. Keep them ignored/untracked unless the project later chooses to
curate screenshots.

### 6. Optional Test Hooks in Frontend

If selectors are brittle, add stable non-visual attributes to existing components in
`frontend/src/App.tsx` and/or related components:

- `data-smoke="public-welcome"`
- `data-smoke="welcome-modal"`
- `data-smoke="login-required-modal"`
- `data-smoke="wallet-display"`
- `data-smoke="round-phase"`
- `data-smoke="mountain-scene"`
- `data-smoke="betting-controls"`
- `data-smoke="current-bets"`
- `data-smoke="leaderboard-panel"`
- `data-smoke="history-panel"`
- `data-smoke="my-bets-panel"`
- `data-smoke="verification-panel"`
- `data-smoke="websocket-status"`

Constraints:

- Attributes must not change styling, layout, or visible copy.
- Attributes must not expose tokens, internal IDs, balances beyond already visible text, or secrets.
- Keep hooks minimal and only where the smoke needs them.

### 7. Existing Smoke Compatibility

Keep existing commands stable:

- `npm run demo:up`
- `npm run smoke:api`

No changes are planned to API smoke semantics. If implementation updates docs or script output to
mention `smoke:browser`, keep that additive.

Do not make `smoke:api` depend on Playwright, browser binaries, or a browser session.

### 8. Documentation and Operational Notes

Update docs during implementation closeout:

- `README.md`
  - GitHub Actions/CI summary.
  - `npm run smoke:browser` usage after `npm run demo:up`.
  - Playwright browser install/cache expectation.
  - Keycloak/Docker Desktop troubleshooting.
  - Explicit statement that full browser smoke is local/manual by default, not required push/PR CI.
- `docs/handoff.md`
  - Implementation status, validation commands, any blocked checks, residual risk.
- `docs/roadmap.md`
  - Mark Phase 4.5 progress and keep Phase 5 release closeout as next/final spec.
- `docs/next-spec-prompt.md`
  - Prepare `/speckit-specify` input for `008-release-readiness-closeout`.
- `docs/architecture.md` or `docs/architecture-decisions.md`
  - Update only if implementation introduces meaningful operational architecture choices beyond
    the plan, such as manual CI jobs or a new browser tooling dependency that needs an ADR.

## Data Model Plan

See `data-model.md` for CI job, browser-smoke checkpoint, readiness, and failure-artifact shapes.

No product data model, database migration, Wallet ledger state, Game domain entity, or persisted
frontend state is planned.

## Contract Plan

See `contracts.md` for CI, script, browser-smoke, diagnostics, environment, and unchanged public
API/messaging contracts.

Public REST, WebSocket, RabbitMQ, Keycloak realm/client security, crash generation, settlement,
and Wallet mutation contracts remain unchanged.

## Validation Plan

Required validation before implementation closeout:

- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit`
- `npm.cmd --workspace @crash/games run test`
- `npm.cmd --workspace @crash/games run test:e2e`
- `npm.cmd --workspace @crash/wallets run test`
- `npm.cmd --workspace @crash/wallets run test:e2e`
- `docker compose config --quiet`
- `npm.cmd run demo:up`
- `npm.cmd run smoke:api`
- `npm.cmd run smoke:browser`

Recommended validation:

- Inspect the GitHub Actions workflow syntax and command names.
- If Docker or Keycloak blocks browser smoke, rerun after Docker Desktop restart and capture the
  exact failure in closeout.
- If Playwright browser binaries are missing, run or document `npx.cmd playwright install chromium`
  and then rerun `npm.cmd run smoke:browser`.

Guardrail validation:

- Search for accidental auth shortcuts, static bearer tokens, public test auth endpoints, or
  browser dev identity controls.
- Search for accidental Wallet mutation route additions.
- Confirm no Game/Wallet domain files import Playwright, CI, browser-smoke, controller DTOs,
  Docker, or script helpers.
- Confirm no logs or artifacts print tokens, authorization codes, PKCE verifiers, passwords, or
  raw local storage.

If any required validation cannot run because of sandbox, Docker Desktop, Keycloak, browser binary,
or network constraints, closeout must state the exact command, observed failure, and remaining
local verification step.

## Risks and Mitigations

- **CI becomes too slow or flaky**: keep push/PR CI to fast tests/build/config; keep full Compose and
  browser Keycloak local by default.
- **Browser smoke weakens auth**: use the real frontend-to-Keycloak PKCE redirect and demo
  credentials only; never inject tokens or add public auth bypasses.
- **Keycloak first boot causes false failures**: preflight OIDC/login readiness with bounded retries
  and clear timeout diagnostics.
- **Selectors break after localization polish**: use stable roles where possible and minimal
  non-visual `data-smoke` hooks where needed.
- **Failure artifacts leak secrets**: default to screenshots and concise text diagnostics; do not
  collect traces that capture credential entry by default.
- **Script mutates developer Docker state unexpectedly**: `smoke:browser` never starts, resets,
  prunes, or rebuilds Docker resources; it points users back to `npm run demo:up`.
- **Scope creeps into release process**: leave final clean-stack proof, docs audit, evaluator
  runbook, tagging, hosted deployment, and final handoff for `008-release-readiness-closeout`.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks in dependency order:

1. Guardrail/context review and current command/package inspection.
2. GitHub Actions workflow for frontend, services, and Compose config validation.
3. Root `smoke:browser` script entry and Playwright dependency/install documentation.
4. Browser-smoke readiness checks and bounded diagnostics.
5. Real Keycloak PKCE login automation with clean browser context.
6. Authenticated game-shell assertions and minimal frontend `data-smoke` hooks if needed.
7. Secret-safe failure artifacts under `output/playwright/`.
8. CI/local validation commands.
9. Documentation closeout in README, handoff, roadmap, and next-spec prompt.

Avoid tasks for Game/Wallet domain changes, RabbitMQ event changes, Wallet mutation APIs, public
auth bypasses, static tokens, full Compose boot in required push/PR CI, broad visual regression
suites, cloud deployment, final release tagging, or the Phase 5 evaluator runbook.

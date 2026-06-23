# Feature Specification: CI/CD and Browser Auth Smoke

**Feature Branch**: `007-ci-cd-browser-auth-smoke`  
**Created**: 2026-06-22  
**Status**: Implemented  
**Input**: `docs/next-spec-prompt.md` and user `/speckit-specify` request

## Summary

Add the final Phase 4 confidence layer before release closeout: repository CI/CD validation and a
browser-automated Keycloak authorization-code/PKCE smoke path.

The feature should make the project feel self-checking for reviewers without changing gameplay,
Wallet settlement, money rules, public contracts, identity-provider security, or the goat/mountain
UI identity. CI should run focused static, unit, build, and Compose validation. Browser auth smoke
should remain an external validation path that exercises the real local Keycloak flow with the demo
`player` user and reports actionable diagnostics when Keycloak or Docker services are not ready.

This spec intentionally defines smoke confidence, not a comprehensive UI regression suite.

## Existing Artifact Alignment

No blocking conflict was found with current docs, the constitution, or completed specs:

- `README.md` already documents `npm run demo:up`, `npm run smoke:api`, the local Keycloak user,
  and the remaining manual browser PKCE checklist.
- `docs/roadmap.md` tracks `specs/007-ci-cd-browser-auth-smoke/` as the completed Phase 4.5
  feature and defines the CI/browser-auth gate.
- `docs/handoff.md` identifies browser PKCE automation as the next planned spec and preserves
  `npm run demo:up` plus `npm run smoke:api` as the fast required smoke path.
- `docs/architecture.md` requires Keycloak OIDC authorization code flow with PKCE for the browser
  and keeps frontend auth as a client flow, not a backend security bypass.
- `docs/reference-ui.md` says the user-facing frontend must not expose dev identity or bearer-token
  entry controls and should keep Keycloak as the identity provider.
- `.specify/memory/constitution.md` requires server authority, safe money, additive compatibility,
  Docker Compose local deliverability, and documentation closeout.
- `specs/003-challenge-polish-operational-confidence/` introduced the deterministic local demo/API
  smoke path that this feature must preserve rather than replace.
- `specs/006-read-only-leaderboard-history/` completed the current evaluator inspection panels
  that browser smoke should assert at a high level.

This spec keeps CI/CD and browser smoke additive so the final `008-release-readiness-closeout`
feature can focus on clean-stack proof, docs audit, evaluator runbook, and final handoff.

## Clarifications

- Clarification pass completed on 2026-06-22. The following answers are encoded so planning can
  proceed without reopening CI/provider, browser-tooling, gating, or selector-stability decisions.
- The CI provider is GitHub Actions.
- The required GitHub Actions workflow runs on push and pull request events and stays focused on
  fast repository validation: frontend typecheck/test/build, Games typecheck/unit/e2e tests,
  Wallets typecheck/unit/e2e tests, and `docker compose config`.
- Service tests in required CI use the existing package scripts:
  `npm --workspace @crash/games run test`, `npm --workspace @crash/games run test:e2e`,
  `npm --workspace @crash/wallets run test`, and
  `npm --workspace @crash/wallets run test:e2e`, with Bun installed in CI as needed.
- Required CI does not boot the full Docker Compose stack and does not run browser Keycloak smoke.
  Full-stack boot and real-browser auth remain local validation by default because Keycloak,
  RabbitMQ, PostgreSQL, Kong, and browser binaries make the path slower and more failure-prone than
  the fast CI gate.
- Docker image build checks are optional. If implemented, they should be in a separately named
  bounded job or documented local command, not a hidden requirement for the main fast CI signal.
- The browser-auth smoke command is a root additive command named `npm run smoke:browser`.
- `npm run smoke:browser` expects the demo stack to have already been started or verified with
  `npm run demo:up`. It may run lightweight readiness preflights, but it must not silently start,
  reset, or prune Docker resources.
- Playwright is the default browser automation tool for the smoke because it matches the project's
  existing screenshot-validation practice and can run a clean Chromium context.
- Playwright dependencies and browser-install/cache expectations must be documented. Browser
  binaries should be installed through the standard Playwright workflow rather than checked into
  the repository.
- Browser smoke must start from a fresh non-persistent browser context so existing local storage,
  `jungle.accessToken`, or Keycloak SSO cookies do not hide the unauthenticated flow.
- Browser smoke must use the real Keycloak authorization-code/PKCE flow with local credentials
  `player` / `player123`. It must not use password bypasses, static bearer tokens, test-only public
  auth endpoints, or weakened Keycloak realm/client configuration.
- Browser smoke should verify representative authenticated shell content, not every UI
  permutation.
- Browser smoke may add stable non-visual test hooks such as `data-testid`/`data-smoke` attributes
  when existing accessible roles or localized text are too brittle. These hooks must not introduce
  new controls, change visible copy, or expose secrets.
- UI assertions should follow the current Brazilian Portuguese copy while preserving `Show
  commands` as the intentional English command-button exception.
- Keycloak first-boot slowness is expected. Browser smoke must use bounded retries and clear
  timeout/error output rather than hanging.
- If Keycloak is unreachable or appears unhealthy, browser smoke should report useful diagnostics
  such as reachable URLs, failed readiness checks, and suggested Docker commands instead of
  silently failing on a downstream selector.
- Failure artifacts may include screenshots or concise text diagnostics. They must not include
  bearer tokens, authorization codes, PKCE verifiers, raw local storage dumps, passwords, or traces
  that capture secret entry by default.
- Existing `npm run demo:up` and `npm run smoke:api` meanings must remain unchanged. New commands
  must be additive.

## User Stories and Acceptance Criteria

### Story 1: Reviewer Gets Fast CI Confidence

As a reviewer, I want repository CI to run focused checks so common type, test, build, and Compose
configuration regressions are caught before manual evaluation.

Acceptance criteria:

- Given a push or pull request runs CI, then the frontend typecheck, frontend tests, and frontend
  production build are executed.
- Given CI runs service validation, then the Games service typecheck/tests and Wallets service
  typecheck/tests are executed through repo-appropriate commands.
- Given CI validates infrastructure files, then Docker Compose config or equivalent syntax
  validation runs against the tracked Compose setup.
- Given a CI validation step fails, then the failed job name and command output make the failing
  layer clear enough to reproduce locally.
- Given Docker image build checks are included, then they are bounded to key images and documented;
  if they are omitted from the required path, the rationale and local alternative are documented.

### Story 2: Developer Runs Browser Keycloak Smoke Locally

As a developer, I want a local browser-auth smoke command so I can prove the real Keycloak PKCE
login path and authenticated game shell without manually clicking through every release candidate.

Acceptance criteria:

- Given the Docker demo stack is healthy, when the browser smoke starts, then it launches a clean
  browser context with no existing `jungle.accessToken`.
- Given no browser session exists, then the smoke verifies the public welcome screen appears before
  authentication and does not auto-redirect to Keycloak.
- Given the smoke clicks or follows the Keycloak login entry point, then it completes the real
  Keycloak authorization-code/PKCE flow using `player` / `player123`.
- Given login succeeds, then the frontend stores a valid authenticated session through the normal
  browser flow rather than receiving a pre-seeded bearer token from the smoke script.
- Given the authenticated game shell loads, then the smoke verifies representative content:
  Keycloak identity/session signal, wallet display, round phase, mountain/goat scene, betting
  controls, current bets, leaderboard/history/my-bets/verification panels, and WebSocket status or
  fallback diagnostics.
- Given the UI is localized, then selector and text assertions account for Brazilian Portuguese
  labels and the intentional `Show commands` exception.

### Story 3: Browser Smoke Fails With Useful Diagnostics

As a maintainer, I want browser smoke failures to explain whether auth, Keycloak, Docker, frontend,
API, or WebSocket readiness failed so debugging does not become guesswork.

Acceptance criteria:

- Given Keycloak is slow on first boot, then the smoke retries readiness checks within a bounded
  timeout before attempting login.
- Given Keycloak is unreachable, then the smoke fails with a clear message that identifies
  `localhost:8080` or the expected OIDC endpoint as unavailable.
- Given a container is unhealthy or the frontend/API is unreachable, then the smoke reports the
  affected surface and suggests inspecting Docker Compose status/logs.
- Given login fails after entering `player` / `player123`, then the smoke reports the current URL,
  page state, and relevant high-level auth step without printing tokens, authorization codes, PKCE
  verifiers, or secrets.
- Given WebSocket status is degraded but the shell loads, then the smoke either fails with a
  WebSocket-specific diagnostic or records the fallback state explicitly, depending on the planned
  acceptance threshold.

### Story 4: Existing Demo and API Smoke Stay Stable

As an evaluator, I want the existing one-command demo and deterministic API smoke to keep their
current meaning so CI/browser polish does not make the challenge harder to review.

Acceptance criteria:

- Given a fresh local review path, `npm run demo:up` still starts or verifies Docker Compose,
  migrations, health checks, frontend reachability, and demo credentials as before.
- Given the stack is healthy, `npm run smoke:api` still validates health, Keycloak token
  acquisition, wallet, bet/cashout or deterministic crash path, enriched history/player-bet/
  leaderboard reads, and provably fair verification.
- Given new browser smoke commands are added, then they do not replace or alter the API smoke
  contract.
- Given CI configuration is added, then local Docker Compose delivery remains the challenge target
  and no cloud runtime becomes required to play or evaluate the app.

### Story 5: Auth and Money Guardrails Are Preserved

As a reviewer, I want CI/browser automation to preserve security and money boundaries so testability
does not weaken the product.

Acceptance criteria:

- Given browser smoke needs an authenticated session, then it obtains that session only through the
  real Keycloak browser flow.
- Given CI or smoke needs test data, then it must not add public arbitrary Wallet credit/debit
  endpoints, gameplay control APIs, static access-token fixtures, or browser dev identity controls.
- Given CI or smoke validates wallet/game behavior, then money values remain integer cents and
  multipliers remain integer basis points.
- Given the browser smoke observes gameplay state, then the Game Service remains authoritative for
  round phase, cashout, crash, Wallet effects, history, leaderboard, and verification.

## Functional Requirements

- **FR-001**: The repository must include a GitHub Actions workflow that runs focused validation
  for the frontend, Games service, Wallets service, and Docker Compose configuration on push and
  pull request events.
- **FR-002**: Frontend CI validation must include typecheck, tests, and production build.
- **FR-003**: Games service CI validation must include TypeScript typecheck plus unit and e2e tests
  through the existing package scripts.
- **FR-004**: Wallets service CI validation must include TypeScript typecheck plus unit and e2e
  tests through the existing package scripts.
- **FR-005**: Infrastructure validation must include `docker compose config` or an equivalent
  Compose syntax/rendering check.
- **FR-006**: CI must document intentionally omitted expensive checks, including full Compose boot
  and browser Keycloak smoke, and provide the corresponding local commands.
- **FR-007**: The feature must add an additive root `npm run smoke:browser` command without
  changing the meaning of `npm run demo:up` or `npm run smoke:api`.
- **FR-008**: Browser smoke must begin from a clean browser context with no existing
  `jungle.accessToken` and no reliance on a pre-authenticated browser session.
- **FR-009**: Browser smoke must verify the public welcome screen appears before authentication.
- **FR-010**: Browser smoke must use Playwright/Chromium to complete the real local Keycloak
  authorization-code/PKCE flow with `player` / `player123`.
- **FR-011**: Browser smoke must verify representative authenticated game-shell content, including
  identity/session signal, wallet, round phase, mountain/goat scene, betting controls, current bets,
  leaderboard/history/my-bets/verification panels, and WebSocket status or diagnostics.
- **FR-012**: Browser smoke must use bounded retries for Keycloak/frontend/API readiness and fail
  with actionable diagnostics when dependencies are unavailable.
- **FR-013**: Browser smoke and CI logs must not print bearer tokens, authorization codes, PKCE
  verifiers, passwords, client secrets, or other secrets.
- **FR-014**: Browser smoke may add stable non-visual test hooks only when needed for selector
  stability, and those hooks must not change visible UI behavior or expose sensitive state.
- **FR-015**: The feature must not add password bypasses, static bearer-token shortcuts, test-only
  public auth endpoints, weakened Keycloak configuration, or browser dev identity controls.
- **FR-016**: The feature must not change Game/Wallet bounded contexts, RabbitMQ settlement,
  cashout behavior, crash generation, wallet mutation rules, public REST/WebSocket contracts, or
  provably fair semantics.
- **FR-017**: UI assertions in browser smoke must be robust to current Brazilian Portuguese labels
  and the explicit `Show commands` button exception.
- **FR-018**: Documentation must describe local prerequisites, CI caveats, browser smoke usage,
  Docker Desktop/Keycloak availability expectations, and recovery steps for unreachable or
  unhealthy services.
- **FR-019**: Failure artifacts may include screenshots or concise text diagnostics, but must not
  include raw local storage dumps or Playwright traces that capture secret entry by default.
- **FR-020**: Implementation closeout must update affected docs plus `docs/handoff.md`,
  `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

## Key Artifacts and Validation Surfaces

- **CI Workflow**: GitHub Actions automation that runs fast validation and optionally bounded
  Docker image checks.
- **Browser Auth Smoke Script**: A local `npm run smoke:browser` Playwright entry point that drives
  a clean browser through the real Keycloak PKCE flow and checks the authenticated game shell.
- **Demo Stack**: Existing Docker Compose local challenge stack started or verified by
  `npm run demo:up`.
- **API Smoke**: Existing deterministic validation command `npm run smoke:api`; it remains the fast
  non-browser gameplay/wallet/verification smoke.
- **Diagnostics Output**: Human-readable failure details for Keycloak, frontend, API, container
  readiness, login, and WebSocket issues.

## Edge Cases

- Docker Desktop is not running or the Docker engine is unavailable.
- Keycloak first boot takes longer than other containers.
- Keycloak becomes unreachable while containers appear partially healthy.
- Keycloak login page shape changes enough that selectors need fallback handling.
- Existing Keycloak SSO cookies would silently authenticate unless the smoke clears context.
- Frontend local storage contains a stale `jungle.accessToken`.
- API returns `401` after a previously valid token and the app clears session state.
- Kong, Games, Wallets, RabbitMQ, or PostgreSQL is not reachable even though the frontend loads.
- WebSocket cannot connect while REST reads still work.
- Browser smoke runs before migrations or realm import are complete.
- CI environment has no Docker daemon, or Docker build checks exceed acceptable runtime.
- Playwright/browser binaries or caches are missing on a fresh checkout.
- Localized UI text changes in a later polish pass.

## Non-Goals

- No gameplay feature changes, betting commands, cashout changes, auto-cashout changes, or manual
  round controls.
- No Wallet debit, credit, refund, seed-credit, settlement, or ledger behavior changes.
- No public arbitrary Wallet mutation APIs or test-only auth/gameplay endpoints.
- No static bearer-token fixtures, password bypasses, Keycloak security weakening, or browser dev
  identity form.
- No change to crash-point generation, `houseEdgeBps = 100`, SHA-256 seed commitment,
  HMAC-SHA256 derivation, multiplier basis-point representation, or verification semantics.
- No broad Playwright regression matrix, visual snapshot suite, accessibility audit, or cross-browser
  certification beyond the focused browser-auth smoke.
- No cloud deployment requirement, hosted preview dependency, production secrets management,
  release tagging, or final evaluator runbook; those belong to the planned
  `008-release-readiness-closeout` spec.
- No full redesign of the app, new landing page, or replacement of the goat/mountain game identity.
- No durable outbox/inbox, deeper observability stack, analytics, sound effects, or additional bonus
  product scope.

## Success Criteria

- CI catches typecheck, test, build, and Compose configuration regressions in the main project
  layers with clear job names and reproducible commands.
- A local maintainer can run a documented browser-auth smoke after `npm run demo:up` and prove the
  public welcome screen, real Keycloak PKCE login, and authenticated game shell.
- Browser auth smoke failures distinguish Keycloak readiness, frontend/API availability, login,
  and WebSocket problems without leaking secrets.
- Existing `npm run demo:up` and `npm run smoke:api` remain valid and unchanged in meaning.
- The feature introduces no auth bypass, money mutation shortcut, public contract break, or
  gameplay behavior change.
- Documentation captures CI behavior, local smoke usage, prerequisites, caveats, and the final
  release-readiness next spec prompt.

## Assumptions

- The completed `006-read-only-leaderboard-history` implementation is the baseline for browser
  shell assertions.
- GitHub Actions is the CI/CD provider for this feature.
- Full Docker Compose plus browser Keycloak smoke may be too slow or flaky for required CI and
  remains a documented local validation path by default. Planning may add a manual
  `workflow_dispatch` job only if it does not weaken the fast required CI signal.
- The local Keycloak realm and `player` / `player123` user remain part of the Docker demo setup.
- Browser automation can use robust role/text/test-id selectors or similarly stable selectors
  without requiring a UI redesign.

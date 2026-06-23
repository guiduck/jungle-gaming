# Implementation Plan: Post-Submission Hardening

**Spec**: `specs/008-post-submission-hardening/spec.md`  
**Branch**: `008-post-submission-hardening`  
**Date**: 2026-06-23  
**Status**: Implemented

## Summary

Run an optional post-submission hardening pass focused on validation evidence, operational caveats,
and documentation agreement for the already-deliverable Jungle Crash Game challenge submission.

The plan intentionally does not add product scope. The default work is:

- run and record fresh local validation evidence;
- observe the most recent browser-visible hotfixes through the real local stack where possible;
- document Docker Desktop, Keycloak, Playwright, Chromium, or port caveats honestly;
- make the smallest README or operational-note correction only if evaluator friction is found;
- close out `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

No Game/Wallet domain work, database work, RabbitMQ contract work, WebSocket contract work, auth
flow redesign, UI feature work, or component refactor is planned unless validation identifies a
blocking evaluator issue.

## Technical Context

- Evaluator runbook: `README.md`, in Brazilian Portuguese.
- Primary validation commands:
  - `npm run demo:up`
  - `npm run smoke:api`
  - optional `npm run smoke:browser`
- Local frontend URL: `http://localhost:3000`.
- Demo login: `player` / `player123` in realm/client `crash-game` / `crash-game-client`.
- Browser auth path: public welcome screen, explicit Keycloak login CTA, Keycloak PKCE callback,
  authenticated game shell.
- Local delivery stack: Docker Compose with PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets,
  migrations, and frontend.
- Existing browser smoke baseline: `scripts/smoke-browser.cjs` and root `npm run smoke:browser`.
- Existing API smoke baseline: `scripts/smoke-api.cjs` and root `npm run smoke:api`.

## Architecture and Scope Boundaries

Preserve the documented architecture:

- Game Service remains authoritative for rounds, bets, crash, cashout, history, leaderboard, and
  verification.
- Wallet Service remains authoritative for wallet balance, debits, credits, and settlement ledger.
- RabbitMQ remains the cross-service settlement path.
- WebSocket remains server-to-client projection only; player actions remain REST.
- Frontend animation may smooth the multiplier display, but cashout and payout truth remain server
  results.
- Browser auth remains Keycloak-first; browser dev identity controls or token injection must not be
  reintroduced.
- Money remains integer cents and multipliers remain integer basis points.

Planned artifact impact:

- **Contracts**: none. No REST, WebSocket, RabbitMQ, Keycloak, smoke-command, or CI contract change
  is planned.
- **Data model**: none. No database migration, persisted model, event shape, or new frontend state
  model is planned.
- **Configuration**: none by default. Configuration changes are allowed only as a blocker fix and
  must be documented.
- **UI**: no visible UI changes by default. Browser observations should use existing UI and smoke
  hooks.
- **Documentation**: expected. README, handoff, roadmap, and next-spec prompt may need closeout
  updates based on validation evidence.

## Implementation Strategy

### 1. Preflight and Current-State Review

Review the current repo state before running validation:

- Confirm `README.md` still documents the intended evaluator flow.
- Confirm root scripts still include `demo:up`, `smoke:api`, `smoke:browser`, `docker:up`, and
  `docker:down`.
- Confirm `specs/008-post-submission-hardening/spec.md` remains scoped to optional hardening.
- Note any existing dirty worktree files before making edits, and avoid touching unrelated changes.

Do not run destructive Docker cleanup unless the user explicitly agrees or the implementation
chooses a clean-stack reset as part of the hardening evidence and records it clearly.

### 2. Command-Based Validation Evidence

Run the preferred validation sequence when Docker Desktop and local prerequisites are available:

1. `npm run demo:up`
2. `npm run smoke:api`
3. `npm run smoke:browser`

Record for each command:

- date and local context;
- command as executed;
- pass/fail/skip result;
- key evidence from output, such as URLs, deterministic crash basis points, wallet/history/
  verification result, or browser smoke checkpoints;
- exact caveat or failure layer if the command fails or is skipped;
- recommended next diagnostic command.

`npm run smoke:browser` is optional when browser prerequisites are unhealthy. Acceptable skips:

- Docker Desktop unavailable or unstable;
- Keycloak unreachable or still warming up;
- Playwright/Chromium missing;
- occupied local ports;
- known machine-specific caveat already observed during this pass.

Skipped browser smoke must be reported as skipped, not passed.

### 3. Live Browser Observation

Use `npm run smoke:browser` if it already covers the required browser behavior. If it does not
cover a required observation, use a manual browser or Playwright-assisted observation and record it
in `docs/handoff.md`.

Required browser observations when feasible:

- clean anonymous browser context shows the public welcome screen and Nina dialogue first;
- the app does not auto-redirect to Keycloak before the login CTA;
- explicit login CTA starts the Keycloak PKCE path;
- successful login with `player` / `player123` reaches the authenticated game shell;
- after placing an accepted bet, the player can click **Pronto para comecar**;
- during a running round, the displayed multiplier visibly advances through the real local stack;
- pressing `C` during a running round attempts cashout even when focus remains in a betting input;
- successful cashout reconciles to server-authoritative result and read-model/wallet refresh.

Observation notes should avoid secrets and should not include raw local storage, authorization
codes, PKCE verifiers, bearer tokens, or passwords.

### 4. Blocker Triage

If validation reveals a failure, classify it before editing:

- **Environment caveat**: Docker Desktop, Keycloak warmup, Playwright/Chromium, occupied ports, or
  local machine state. Record the caveat and recovery command.
- **Documentation friction**: README or operational notes are confusing, incomplete, or stale.
  Correct the smallest relevant text and keep docs aligned.
- **Script diagnostics issue**: smoke scripts work but produce confusing output. Improve messages
  only if the change does not alter command semantics.
- **Evaluator blocker**: the README runbook path cannot be completed despite healthy local
  prerequisites. Fix the smallest product or script defect required to restore the documented path.
- **Deferred production hardening**: outbox/inbox, broad browser regression, observability depth,
  sound effects, cloud deployment, or similar. Keep deferred.

Only evaluator blockers justify code changes outside documentation or diagnostics. Any blocker fix
must preserve public contracts and must be validated with focused checks plus the relevant smoke.

### 5. Documentation Closeout

Update affected docs based on actual evidence:

- `README.md`
  - update only if evaluator steps, troubleshooting, or caveats need a small correction;
  - keep the runbook in Brazilian Portuguese and beginner-friendly;
  - do not add speculative production-hardening instructions as required setup.
- `docs/handoff.md`
  - record validation commands, outcomes, screenshots/artifacts if relevant, skipped checks, and
    caveats;
  - state clearly whether this pass found any blocker.
- `docs/roadmap.md`
  - keep this pass as optional/post-submission hardening;
  - keep deferred production-readiness work explicit and non-blocking.
- `docs/next-spec-prompt.md`
  - either state that no further Spec Kit work is needed or prepare the next optional prompt based
    only on actual findings.

Update `docs/architecture.md` or `docs/architecture-decisions.md` only if the hardening pass makes
a meaningful architecture or operational decision beyond validation/documentation.

## Validation Plan

Preferred validation:

- `npm.cmd run demo:up`
- `npm.cmd run smoke:api`
- `npm.cmd run smoke:browser`

Focused validation if documentation-only changes are made:

- Read the edited README/handoff/roadmap/next-spec sections for agreement.
- Confirm root command names against `package.json`.

Focused validation if smoke script diagnostics are changed:

- `node --check scripts/smoke-browser.cjs`
- `node --check scripts/smoke-api.cjs` if touched
- `npm.cmd run smoke:browser` when prerequisites are healthy

Focused validation if frontend behavior is changed for a blocker:

- `npx.cmd tsc -p frontend/tsconfig.json --noEmit`
- `npm.cmd --workspace frontend run test`
- `npm.cmd --workspace frontend run build`
- `npm.cmd run smoke:browser`

Focused validation if Games behavior is changed for a blocker:

- `npx.cmd tsc -p services/games/tsconfig.json --noEmit`
- `npm.cmd --workspace @crash/games run test`
- `npm.cmd --workspace @crash/games run test:e2e`
- `npm.cmd run smoke:api`
- `npm.cmd run smoke:browser` when the browser-visible behavior is affected

Guardrail validation for any code change:

- confirm no new public auth bypass or browser dev identity control;
- confirm no new arbitrary Wallet mutation endpoint;
- confirm no public REST/WebSocket/RabbitMQ contract expansion unless explicitly approved;
- confirm Game/Wallet domain code does not import controllers, DTOs, MikroORM, RabbitMQ,
  Socket.IO, Playwright, scripts, or browser tooling;
- confirm logs/artifacts do not print tokens, authorization codes, PKCE verifiers, passwords, or
  raw local storage.

If a command cannot run because of Docker Desktop, Keycloak, browser binaries, sandbox, or local
machine constraints, closeout must state the exact command, the observed blocker, and the remaining
manual verification step.

## Risks and Mitigations

- **Scope creep after submission**: keep this plan validation-first and require a concrete
  evaluator blocker before code changes.
- **False confidence from stale evidence**: record only commands actually run during the pass and
  distinguish skipped checks from passed checks.
- **Destructive clean-stack reset surprises local data**: avoid destructive cleanup by default; if
  used, make it intentional and record it.
- **Browser smoke depends on local machine health**: allow explicit skip reasons and document
  recovery commands.
- **Keycloak first-boot slowness looks like auth failure**: classify readiness/warmup separately
  from product defects.
- **Manual browser observation becomes vague**: record specific observed checkpoints rather than a
  generic "looked good" note.
- **Documentation drift**: close out README, handoff, roadmap, and next-spec prompt together.

## Task Generation Guidance

When generating `/speckit-tasks`, keep tasks short and dependency-ordered:

1. Inspect current scripts, README, handoff, roadmap, and dirty worktree context.
2. Run or intentionally skip `npm run demo:up` with evidence.
3. Run or intentionally skip `npm run smoke:api` with evidence.
4. Run or intentionally skip `npm run smoke:browser` with evidence.
5. Capture any manual browser observations not covered by smoke automation.
6. Classify any failures as environment caveat, documentation friction, diagnostics issue,
   evaluator blocker, or deferred production hardening.
7. Apply the smallest documentation or diagnostics fixes needed.
8. Apply code fixes only for confirmed evaluator blockers.
9. Run focused validation for any changed code or scripts.
10. Close out README, `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

Avoid tasks for new gameplay features, auth flows, Wallet behavior, RabbitMQ contracts, WebSocket
contracts, persistence schemas, UI panels, broad Playwright regression suites, cloud deployment,
transactional outbox/inbox, or production observability.

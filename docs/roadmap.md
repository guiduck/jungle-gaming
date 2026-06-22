# Roadmap

This file describes the stable product direction. For current execution status, see
`docs/handoff.md`.

## Phase 1. Foundation

Goal:

- Import the official challenge scaffold.
- Replace boilerplate docs with project-specific direction.
- Lock stack decisions and DDD boundaries.
- Create the initial Spec Kit constitution.
- Prepare the first Spec Kit prompt.

Status:

- Complete for initial foundation. The official scaffold is imported, documentation is project
  specific, stack decisions are recorded, and the next Spec Kit prompt is ready.

Gate:

- Root contains the official scaffold plus preserved agent/Spec Kit workflows.
- `docs/` describes product, architecture, domain model, UI direction, roadmap, handoff, and next
  Spec Kit prompt.
- `.specify/memory/constitution.md` exists and reflects project guardrails.
- `docker compose config` renders successfully from tracked files.

## Phase 2. Gameplay Specification

Goal:

- Use Spec Kit to specify the crash game foundation: round lifecycle, bet/cashout rules, wallet
  settlement, RabbitMQ events, WebSocket projection, and provably fair verification.

Status:

- Complete. The first gameplay foundation spec exists at
  `specs/001-gameplay-foundation/spec.md`.

Gate:

- A focused `spec.md` exists with user stories, requirements, edge cases, acceptance criteria, and
  non-goals for the gameplay MVP.

## Phase 2.5. Gameplay Planning

Goal:

- Use Spec Kit to plan implementation from `specs/001-gameplay-foundation/spec.md`, including
  contracts, data model, service boundaries, event flow, validation, and task readiness.

Status:

- Complete. The implementation plan exists at `specs/001-gameplay-foundation/plan.md`, with
  supporting data model and contract notes.

Gate:

- A focused `plan.md` exists and is ready for `/speckit-tasks`.

## Phase 2.75. Gameplay Tasks

Goal:

- Generate ordered implementation tasks from `specs/001-gameplay-foundation/plan.md`.

Status:

- Complete. Ordered implementation tasks exist at
  `specs/001-gameplay-foundation/tasks.md`.

Gate:

- A focused `tasks.md` exists and can drive implementation without re-opening plan decisions.

## Phase 3. Production MVP

Goal:

- Implement the gameplay MVP on the imported scaffold using NestJS, MikroORM, RabbitMQ, Keycloak,
  Kong, and Vite React.

Status:

- Gameplay foundation MVP is locally smoke-validated for the in-memory runtime. The current slice
  has domain rules, application ports/use cases, in-memory runtime adapters, MikroORM
  mapping/migration artifacts, RabbitMQ adapter classes, seed-credit wallet bootstrap, internal
  Wallet HTTP debit/payout confirmation for local gameplay, provably fair verification metadata,
  Keycloak/JWT guards with local identity fallback, Socket.IO WebSocket gateway, crash-point-aware
  in-process round runner, Vite frontend shell, goat run/jump/idle sprite animation, history/player
  bet/verification UI, shared contracts, Docker frontend wiring, Docker stack startup, health
  checks, unit tests, and local balance smoke.

- Durable PostgreSQL runtime persistence, automatic migration execution, Keycloak-first auth mode,
  RabbitMQ wallet effects, automated money/game e2e coverage, mobile/desktop visual validation, and
  two-client WebSocket convergence are implemented for local challenge delivery.

Gate:

- `docker compose up -d` starts the full stack from tracked files.
- Local-identity player can create/read wallet, place a bet, cash out or crash, see wallet updates,
  and inspect round history/verification.
- Unit tests cover core Game and Wallet domain behavior.
- Remaining gate before production-grade delivery: optional bonus hardening such as transactional
  outbox/inbox, seeded browser e2e, observability, and challenge polish.

## Phase 3.5. Persistence, Auth, and E2E Hardening

Goal:

- Promote the gameplay MVP from local in-memory smoke to durable challenge delivery by wiring
  MikroORM repositories, running migrations, exercising real Keycloak login, and adding automated
  e2e coverage.

Status:

- Complete for local challenge delivery. PostgreSQL/MikroORM providers are wired in Docker/local
  mode, migrations run automatically and repeatably, Keycloak mode is the default, RabbitMQ debit
  and payout flows are idempotent, restart reconciliation prevents stale multi-active gameplay
  state, and automated/containerized tests cover the critical money/game paths.

Gate:

- Game and Wallet read/write through PostgreSQL-backed MikroORM repositories.
- Migrations run repeatably in Docker/local setup.
- Real Keycloak login is the primary player path, with local identity explicitly scoped to dev
  smoke.
- Automated e2e coverage proves wallet debit/credit idempotency, insufficient balance, duplicate
  bet rejection, cashout acceptance/rejection, verification metadata, and RabbitMQ retry behavior.
- Restart reconciliation guarantees only one active playable round after old/interrupted data.
- Desktop/mobile authenticated UI and two-client WebSocket convergence are smoke-validated.

## Phase 4. Polish and Bonus Scope

Goal:

- Add optional differentiators after eliminatory criteria pass.

Status:

- Challenge polish and operational confidence are now implemented as the first Phase 4 slice:
  root demo/smoke scripts, deterministic local-demo smoke support, concise lifecycle logs, and
  copy-paste evaluator documentation. A small frontend telemetry layer now mirrors the backend
  lifecycle logs in the browser console for auth/API/WebSocket/gameplay events without adding heavy
  monitoring infrastructure.
- Server-authoritative auto-cashout is implemented as the next Phase 4 product differentiator:
  players can set a stored target on bet placement, Game evaluates it before crash, manual/auto
  cashout share one bet transition and one Wallet payout idempotency key, and history/projections
  expose the trigger without making the frontend payout truth.
- Procedural crash mountain and goat-angle polish is implemented as the next Phase 4 slice:
  the former linear goat movement now uses a frontend-only `displayedMultiplierBps` projection,
  a sampled procedural SVG mountain path, right-to-left highlighted trail treatment, and
  tangent-based sprite rotation while keeping the server multiplier authoritative.
- Read-only leaderboard and richer history is implemented as the next Phase 4 evaluator
  inspection slice: completed-round history now exposes aggregate bet/outcome facts and notable
  cashouts, a deterministic realized-cashout leaderboard ranks by payout or multiplier, and player
  bet history shows round outcome context without introducing wallet mutation, new gameplay
  commands, social profiles, chat, admin tooling, or new settlement behavior.
- Local demo/CI readiness has been tightened after full reset validation: RabbitMQ health now
  verifies the AMQP listener, Game/Wallet RabbitMQ clients retry transient first-boot connection
  refusal, Kong waits for Keycloak health, and `npm run demo:up`/`npm run smoke:api` pass from a
  clean Docker stack without manual service-order pauses.
- Presentation polish is implemented as a frontend-only Phase 4 slice: a visual-novel-style
  welcome/tutorial flow thanks the Jungle Gaming team, introduces Nina the climbing goat, uses
  a login-required modal for missing sessions or API `401` responses with a Keycloak button plus
  10-second automatic redirect countdown, adds a command modal, and enables keyboard
  betting/cashout shortcuts without changing backend auth, gameplay, wallet,
  settlement, read models, or public API contracts. The friendly phase dialogue is scoped by the
  current player's active bet state, so cashout guidance does not appear for spectators or players
  without a pending bet. The browser UI is Keycloak-only; dev identity remains a backend/dev smoke
  concern rather than an in-game control.
- Browser bet placement reliability is tightened for local play: Games revalidates the current
  betting round after Wallet debit confirmation and requests an idempotent refund if the
  confirmation arrives after the betting window, while Compose defaults keep a larger Wallet result
  timeout without stretching the visible betting phase.
- A June 22 punctual polish follow-up is complete before the next spec: current bets now lives in a
  compact right-rail panel, leaderboard/history/player bet panels remain readable below the core
  scene, my bets plus verification stack at full width beneath leaderboard on desktop, manual round
  controls refresh read models, and local runner defaults now keep the deterministic `4.66x` demo
  crash in sync with playable goat/mountain pacing.
- A later June 22 realtime multiplier correction fixed the browser-visible stall/teleport behavior:
  WebSocket phase events carry round snapshots, the frontend applies current-round multiplier ticks
  without waiting for polling, `round.betting.opened` is emitted/listened consistently, and Docker
  runner defaults use a 3-second betting phase plus smaller `0.075x` running steps.
- A same-day multiplier smoothness hotfix further reduces freeze risk: Socket.IO can fall back to
  polling if WebSocket upgrade is unavailable, the socket path can be configured per runtime, and
  the frontend running animation keeps advancing the displayed multiplier with a capped
  runner-speed estimate while waiting for server tick reconciliation.
- A June 22 localization follow-up is complete for the player-facing frontend: the pre-login shell,
  game layout section titles, betting controls, status labels, read-model empty states, outcome
  labels, document language, and currency display now target Brazilian Portuguese. The command
  entry point remains `Show commands` by explicit product request.
- A final playability hotfix is complete: accepted bettors must mark **Pronto para comecar** before
  the automatic runner starts the climb, preventing wallet/auth lag from eating the betting window.
  Empty betting rounds still progress automatically. Crash points stay below `14.00x` without
  pinning every overflow to the ceiling, avoiding unreadable extreme rounds and repeated `14.00x`
  outcomes.
- A final June 22 shortcut hotfix is complete: the `C` cashout keyboard command works during a
  running round even when focus remains in the bet amount or auto-cashout input, while server-side
  cashout authority and the pending-bet guard remain unchanged.

Candidates:

- The final evaluator README runbook is complete for submission: prerequisites, `.env` handling,
  demo startup, production-like local startup, smoke commands, URLs, credentials, troubleshooting,
  and deferred work are documented in `README.md`. The runbook is now in Brazilian Portuguese with
  beginner-friendly steps for demo mode and production-like local mode.
- If work continues after delivery, use a post-submission hardening pass for fresh full-stack smoke
  evidence and any remaining production-readiness notes.
- Defer transactional outbox/inbox, broader Playwright regression coverage, richer observability,
  and sound effects unless a later product requirement explicitly justifies them.

## Phase 4.5. CI/CD and Browser Auth Smoke

Goal:

- Make the repository self-checking through CI/CD and automate the currently manual Keycloak
  browser login smoke without weakening auth.

Status:

- Complete. The implementation adds GitHub Actions push/PR validation, the additive
  `npm run smoke:browser` Playwright command, secret-safe browser-smoke diagnostics, stable
  non-visual smoke hooks, Compose image-build validation, and a required full-stack smoke job that
  runs deterministic demo startup, API smoke, and browser Keycloak PKCE smoke.

Gate:

- CI runs focused frontend/service validation: typecheck, tests, build, smoke script syntax checks,
  and `docker compose config`.
- CI builds the Compose service images and then runs deterministic full-stack startup,
  `npm run smoke:api`, and `npm run smoke:browser`.
- CI collects Compose logs and Playwright screenshots when the full-stack smoke fails.
- `npm run smoke:browser` validates the login-required modal, Keycloak PKCE login, authenticated
  game shell, wallet/round/read panels, and useful failure diagnostics.
- The smoke handles Keycloak first-boot slowness and reports when Keycloak is unreachable instead
  of hanging indefinitely.
- Existing `npm run demo:up` and `npm run smoke:api` keep their current meaning.

## Phase 5. Release Readiness Closeout

Goal:

- Finish the challenge with a final clean-stack validation, documentation audit, and evaluator
  handoff package.

Status:

- Documentation closeout is complete enough for challenge submission. `README.md` now serves as
  the evaluator runbook, including environment defaults, demo mode, production-like local mode,
  validation commands, troubleshooting, URLs, credentials, and explicit deferred work.
- A fresh `npm run demo:up`, `npm run smoke:api`, and optional `npm run smoke:browser` pass remains
  the preferred final confidence check on the submitter machine.
- The latest frontend-only multiplier smoothness hotfix has build and focused test coverage; it
  should be included in the final live browser smoke so the real Kong/Socket.IO path is observed.
- The latest frontend-only `C` cashout shortcut hotfix should be included in the final live browser
  smoke by placing a bet, leaving focus in a betting input, and pressing `C` during the climb.

Gate:

- README runbook path is documented in Portuguese from Docker Desktop start to playable
  authenticated UI.
- README, handoff, roadmap, and next-spec prompt agree that no new feature work is required before
  submission.
- Known non-goals and deferred bonuses are explicit.
- Final validation commands and environment caveats are captured in `README.md` and
  `docs/handoff.md`.

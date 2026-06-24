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
- Presentation polish is implemented as a frontend-only Phase 4 slice: a public visual-novel-style
  welcome/tutorial flow thanks the Jungle Gaming team, introduces Nina the climbing goat, keeps
  anonymous visitors on the welcome page until they choose Keycloak login, uses a login-required
  modal only for protected-session failures or API `401` responses with a Keycloak button plus
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
- A final maintainability closeout is complete: the frontend game shell panels were extracted from
  `App.tsx` into focused presentational components, and Games payout-request preparation was made
  more explicit. This is intentionally non-functional and preserves public API contracts,
  RabbitMQ/WebSocket behavior, auth, wallet settlement, smoke selectors, and player-facing flow.
- A June 23 provably fair correction is complete: demo mode remains intentionally deterministic at
  `4.66x` for smoke validation, while normal local play now generates unrevealed random server
  seeds, stores them server-side, publishes only `serverSeedHash` before crash, and reveals the seed
  only after the completed round. Completed-round reads now key off `crashedAt`, so active rounds
  with stored secret seeds do not appear as history.
- Optional challenge extras are now implemented: Kong applies local per-IP rate limiting at the
  gateway, the frontend offers Auto Bet with fixed-value and Martingale strategies plus
  configurable stop-loss, and the automation still uses normal server-authoritative REST actions.
- A player-facing privacy tweak is complete: the right-rail round summary no longer shows the active
  crash point during `betting` or `running`; it reveals the value only after the crash/settlement
  state.
- A June 23 frontend organization refactor is complete: `App.tsx` now only coordinates auth/screen
  selection, the authenticated game shell, public welcome, game panels, dialogue/shortcut behavior,
  game queries/mutations/socket/animation hooks, and CSS areas are split into focused modules. This
  is a maintainability-only change and preserves gameplay, auth, wallet, API, RabbitMQ, WebSocket,
  and smoke behavior.
- A README presentation polish pass is complete: the root README now uses `Goat Run` as the
  top-level project name, adds badges and a linked table of contents, keeps setup/run instructions
  concise, documents delivered challenge extras, and includes short implementation snippets without
  becoming a long-form architecture document.
- The Storybook extra is complete with the official React/Vite Storybook package: stories cover the
  game scene, command modal, betting/wallet states, and read-model panels, and the frontend Docker
  build publishes the static Storybook artifact at `/storybook` so the deployed environment can
  expose `https://jungle.gfig.space/storybook`.
- A June 24 frontend organization follow-up is complete: large UI entries now use component folders
  with `index.tsx`, `App` and the authenticated game shell delegate state/effects to hooks,
  keyboard commands/dialogues live under `frontend/src/constants/`, shared display helpers live
  under `frontend/src/utils/formatters.ts`, GameScene debug rendering is isolated, and JSX
  null-fallback render ternaries were replaced with boolean branches. This is maintainability-only
  and does not change gameplay, auth, wallet settlement, public contracts, smoke selectors, or
  deployed routes.

Candidates:

- The final evaluator README runbook is complete for submission: prerequisites, `.env` handling,
  demo startup, production-like local startup, smoke commands, URLs, credentials, troubleshooting,
  and deferred work are documented in `README.md`. The runbook is now in Brazilian Portuguese with
  beginner-friendly steps for demo mode and production-like local mode.
- The README now explicitly explains how to run demo, production-like local mode, and both through
  Docker Compose one at a time, plus why demo always shows the fixed `4.66x` crash.
- The optional post-submission hardening pass is complete: fresh demo/API/browser validation
  evidence was captured, the first-run public welcome login CTA remains clickable while Nina's
  dialogue is visible, and input-focused `C` cashout works during running rounds.
- The optional VPS deploy path is available through GitHub Actions. `Deploy VPS` runs manually or
  after successful `CI` on `main`, uses `VPS_SSH_PRIVATE_KEY`, deploys the Compose stack to
  `jungle.gfig.space`, and should be manually triggered after the GitHub secret and VPS path are
  confirmed.
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
  runs deterministic demo startup, API smoke, and browser Keycloak PKCE smoke. A follow-up deploy
  workflow now provides optional VPS deployment to `jungle.gfig.space` after successful `CI` on
  `main` or by manual dispatch.

Gate:

- CI runs focused frontend/service validation: typecheck, tests, build, smoke script syntax checks,
  and `docker compose config`.
- CI builds the Compose service images and then runs deterministic full-stack startup,
  `npm run smoke:api`, and `npm run smoke:browser`.
- CI collects Compose logs and Playwright screenshots when the full-stack smoke fails.
- `npm run smoke:browser` validates the public welcome screen, Keycloak PKCE login,
  authenticated game shell, wallet/round/read panels, and useful failure diagnostics.
- The smoke handles Keycloak first-boot slowness and reports when Keycloak is unreachable instead
  of hanging indefinitely.
- Existing `npm run demo:up` and `npm run smoke:api` keep their current meaning.
- VPS deploy requires `VPS_SSH_PRIVATE_KEY` in GitHub secrets and assumes `/opt/jungle-gaming` on
  the server unless `VPS_PATH` is configured.

## Phase 5. Release Readiness Closeout

Goal:

- Finish the challenge with a final clean-stack validation, documentation audit, and evaluator
  handoff package.

Status:

- Documentation closeout is complete enough for challenge submission. `README.md` now serves as
  the evaluator runbook, including environment defaults, demo mode, production-like local mode,
  validation commands, troubleshooting, URLs, credentials, and explicit deferred work.
- A fresh `npm run demo:up`, `npm run smoke:api`, and `npm run smoke:browser` pass completed on
  June 23, 2026 after refreshing the frontend container.
- The latest frontend-only multiplier smoothness hotfix has build and focused test coverage; it
  is now covered by live browser observation through the real Kong/Socket.IO path.
- The latest frontend-only `C` cashout shortcut hotfix should be included in the final live browser
  smoke by placing a bet, leaving focus in a betting input, and pressing `C` during the climb; this
  passed on June 23 after removing debounce from the cashout shortcut.
- The latest public-welcome auth correction should be included in the final live browser smoke by
  confirming anonymous visitors see the welcome/dialogue first and only reach the game after
  Keycloak login; this passed on June 23.
- The final maintainability closeout has focused frontend and Games typecheck/test/build coverage;
  because it does not alter runtime contracts or Docker configuration, the preferred remaining
  confidence pass is still the existing clean-stack demo/API/browser smoke sequence.

Gate:

- README runbook path is documented in Portuguese from Docker Desktop start to playable
  authenticated UI.
- README, handoff, roadmap, and next-spec prompt agree that no new feature work is required before
  submission.
- Known non-goals and deferred bonuses are explicit.
- Final validation commands and environment caveats are captured in `README.md` and
  `docs/handoff.md`.
- Provably fair seed handling prevents public round IDs from predicting normal-mode crash points
  before the server reveals the seed.
- Active round UI does not disclose the crash point before the round is terminal.
- Final internal quality changes are limited to componentization and readable service flow, with no
  new feature scope.
- Frontend organization changes should remain structural only unless a later evaluator bug requires
  behavior changes; the current follow-up is covered by frontend build and tests.
- No additional Spec Kit feature work is required unless evaluator feedback reveals a blocking
  issue or the project intentionally resumes optional production hardening.

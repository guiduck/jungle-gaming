# Handoff

## Current Status

- `current_phase`: Phase 4. Polish and Bonus Scope.
- `current_focus`: Phase 4 finalization. CI/CD plus browser-automated Keycloak PKCE smoke is
  implemented; one final release-readiness closeout spec should follow.
- `summary`: The hardening and challenge polish slices are complete for local challenge delivery.
  The current Phase 4 differentiator adds optional auto-cashout targets stored with accepted bets,
  server-side automatic cashout evaluation before crash, manual/auto cashout reconciliation through
  a single bet transition, durable Game persistence fields, compact frontend controls, and
  continued Wallet payout idempotency through the existing RabbitMQ payout flow. The visual polish
  slice closes the deferred ADR-008 visual gap: the frontend now draws a procedural crash mountain
  from the multiplier projection and rotates the goat by the curve tangent without changing server
  gameplay truth. The latest read-only inspection slice adds completed-round aggregates, realized
  cashout leaderboards, and player bet history without changing betting, cashout, Wallet, RabbitMQ,
  settlement, or WebSocket command behavior. The Docker readiness path was tightened after local
  reset testing: RabbitMQ health now checks the AMQP listener, Game/Wallet RabbitMQ adapters retry
  first-boot connections, and `npm run demo:up` plus `npm run smoke:api` pass from a clean
  `docker compose down -v` stack. The latest frontend polish slice adds post-login tutorial,
  command modal, Enter-to-advance dialogue, keyboard betting/cashout shortcuts, friendly phase
  dialogue, and a login-required modal that starts the Keycloak PKCE redirect after a visible
  10-second countdown without changing backend auth, gameplay, Wallet, RabbitMQ, persistence, read
  models, or public contracts.
  A June 22 follow-up fixed punctual playability issues before the next spec: the frontend now keeps
  current bets in the compact right rail instead of a wide empty panel, refreshes read models after
  manual round controls, and smooths the goat/mountain multiplier toward server WebSocket ticks
  instead of visually reaching the crash point before the backend.
  A later June 22 playability correction fixed the visible multiplier stall/teleport behavior:
  WebSocket phase events now carry round snapshots, the frontend applies multiplier ticks directly
  to the current round without waiting for polling, `round.betting.opened` is emitted/listened with
  one event name, and Docker runner defaults no longer hold betting for 30 seconds before jumping
  in `0.20x` increments.
  A later same-day multiplier smoothness hotfix made the Socket.IO path configurable, restored
  polling fallback when WebSocket upgrade is unavailable, and keeps the displayed multiplier
  advancing with a local `requestAnimationFrame` runner-speed estimate while server ticks remain
  the preferred reconciliation source.
  A later June 22 auth UX correction removed the browser dev identity form and manual dev controls:
  browser play is Keycloak-only and unauthenticated sessions or API `401` responses show a
  login-required modal with a Keycloak button plus 10-second automatic redirect countdown. The
  browser login starter now preflights Keycloak readiness and leaves a retryable modal error if
  Keycloak is unreachable.
  A later June 22 localization follow-up changed the player-facing frontend copy to Brazilian
  Portuguese across the pre-login shell, game layout section titles, betting controls, round
  status labels, read-model empty states, outcome labels, and BRL currency display, while keeping
  the top command entry point as the requested `Show commands` label.
  The CI/browser-auth smoke slice adds GitHub Actions push/PR validation for frontend, services,
  Compose image builds, deterministic full-stack smoke, API smoke, and browser Keycloak PKCE smoke,
  plus an additive `npm run smoke:browser` Playwright command that starts from a clean browser
  context, follows the real Keycloak PKCE login, and checks the authenticated game shell without
  adding auth bypasses or changing existing demo/API smoke semantics.

## Recent Decisions

- Use MikroORM instead of Prisma or TypeORM for the NestJS services because the challenge evaluates
  DDD, aggregates, invariants, and Unit of Work style persistence.
- Keep Keycloak, Kong, RabbitMQ, PostgreSQL, and Docker Compose from the challenge stack.
- Keep evaluator startup one-command friendly: Compose readiness and service startup retries must
  support `npm run demo:up` without manual service ordering or sleep steps.
- Use Vite + React for the frontend.
- Use TanStack Query for server state and Zustand for hot game state.
- Treat the server as the authoritative source of game state; frontend state is a projection for
  rendering and animation.
- Render the crash progression as a goat climbing a mountain, with replaceable SVG art later.
- Use `displayedMultiplierBps` as the only authoritative input for procedural mountain/goat visual
  projection; the frontend curve must not determine crash, cashout, payout, or wallet truth.
- Use the tracked service `.env.example` files in Docker Compose so a fresh checkout does not need a
  manual `.env` copy before `bun run docker:up`.
- Created the initial Spec Kit constitution in `.specify/memory/constitution.md` from current
  project docs and governance needs.
- Created `specs/001-gameplay-foundation/spec.md` from `docs/next-spec-prompt.md`.
- Clarified the gameplay spec: reserve/debit-first bet acceptance, server-authoritative cashout
  with latency-aware UI feedback, simple hash-chain plus HMAC provably fair, and KISS as a project
  rule.
- Created `specs/001-gameplay-foundation/plan.md` with supporting `data-model.md` and
  `contracts.md`.
- Created `specs/001-gameplay-foundation/tasks.md` with dependency-ordered implementation,
  validation, smoke, and documentation closeout tasks.
- Implemented the first MVP slice: pure Game/Wallet domain classes, domain unit tests, in-memory
  application state, official-shape REST endpoints, Vite React frontend, shared event/socket
  contracts, CORS, and frontend service wiring in Docker Compose.
- Added application-layer ports plus in-memory infrastructure adapters for Game rounds/events and
  Wallet storage. This keeps the current slice simple while making the MikroORM/RabbitMQ swap
  explicit for the next slice.
- Added explicit shared RabbitMQ event contract types for wallet debit and payout request/result
  events.
- Added basic Swagger/OpenAPI setup at `/docs` in both services, DTO documentation, integer DTO
  validation for bet/cashout commands, and HTTP `400` responses for domain rejections instead of
  returning error bodies with status `200`.
- Extended frontend data coverage with TanStack Query hooks and UI sections for round history,
  player bet history, and provably fair verification data.
- Kept wallet credit/debit public REST endpoints out of the Wallet Service. The temporary in-memory
  wallet starts the test player with local demo balance until the proper seed/migration path exists.
- Ran a follow-up Spec Kit clarification/plan pass. The active gameplay plan now fixes
  `houseEdgeBps = 100`, SHA-256 seed commitments, HMAC-SHA256 crash derivation, retryable
  wallet-confirmation timeout behavior for bet placement, `seed_credit` bootstrap funding, and
  NestJS WebSockets with the simplest Socket.IO-compatible adapter as the MVP default.
- Refreshed `specs/001-gameplay-foundation/tasks.md` so the pending implementation tasks explicitly
  cover those clarified provably fair, RabbitMQ timeout, seed wallet, WebSocket, validation, smoke,
  and documentation requirements without renumbering completed work.
- Implemented the Game application-layer slice: explicit wallet gateway port, immediate
  replaceable wallet gateway adapter, pre-wallet domain validation for bets, accepted wallet
  confirmation handling, payout credit requests for cashed-out bets, wallet result event hook, and
  verification records with SHA-256/HMAC-SHA256 formula metadata plus `houseEdgeBps = 100`.
- Implemented the Wallet application-layer slice: operation repository and result publisher ports,
  in-memory operation adapter, no-op result publisher adapter, idempotent `seed_credit` wallet
  bootstrap, and recording/publishing of debit, payout credit, and seed-credit operation results.
- Added MikroORM schema/config/migration artifacts for Game (`rounds`, `bets`,
  `game_message_receipts`) and Wallet (`wallets`, `wallet_operations`) with `house_edge_bps` and
  `seed_credit` support.
- Added RabbitMQ adapter classes for Game wallet request publishing/result consumption with
  idempotency receipts and Wallet request consumption/result publishing with idempotent operation
  handling.
- Added lightweight Keycloak/JWT guards that derive `PlayerId` from bearer token `sub`, while
  preserving `x-player-id` for local smoke.
- Added NestJS WebSocket event gateway, WebSocket-backed Game event publisher, in-process round
  runner, frontend Socket.IO client, local identity/token controls, and a frontend auth helper test.
- Documented MVP trade-offs for the in-process runner, Socket.IO transport, and retryable wallet
  confirmation timeout in `docs/architecture-decisions.md`.
- Fixed Docker runtime blockers found during manual validation: Postgres 18 volume path now mounts
  at `/var/lib/postgresql`, and `docker/postgres/init-databases.sh` now uses LF endings plus
  `/bin/sh`.
- Replaced the fake local Game wallet gateway in the active Docker profile with an internal Wallet
  HTTP gateway. Wallet now exposes protected internal debit/payout endpoints using
  `x-internal-token`, so local bets debit the Wallet aggregate and cashout payout credits reconcile
  in the displayed balance without exposing arbitrary public credit/debit REST APIs.
- Updated the round runner so it crashes when the running multiplier reaches the round's
  provably-fair crash point instead of after a fixed number of running ticks.
- Cropped `escape_goat_sprites.png` into replaceable frontend assets:
  `frontend/public/assets/goat/run.png`, `jump.png`, `idle.png`, plus metadata, and wired the
  game scene to use those sprite animations.
- Wired Docker/local persistence providers to MikroORM repositories for Game and Wallet behind
  `PERSISTENCE_ADAPTER=postgres`; memory adapters are now explicit dev mode.
- Added automatic `games-migrations` and `wallets-migrations` Compose services plus service-level
  `bun run migration:up` scripts using MikroORM CLI.
- Switched Docker/local wallet effects to RabbitMQ by default. Fixed the Wallet request binding to
  `wallet.#` so `wallet.bet_debit_requested` routes correctly.
- Added Wallet PostgreSQL operation idempotency lookup and atomic wallet-balance-plus-ledger
  persistence using a MikroORM transaction.
- Added Game PostgreSQL round repository methods for current round, active rounds, completed
  history, verification lookup, and player bet snapshots.
- Added restart reconciliation that loads active rounds, preserves accepted bets, crash-settles
  interrupted running rounds, and replays cashed-out payouts idempotently.
- Made Keycloak mode the default backend/frontend path; `x-player-id` is limited to explicit
  backend/dev smoke usage, and the browser UI no longer exposes dev identity controls.
- Fixed the Keycloak Compose healthcheck to target the Keycloak management health endpoint on
  port `9000`, while leaving the public OIDC/login surface on port `8080`.
- Included service tests in the Games/Wallets Docker build contexts so containerized Bun unit/e2e
  validation runs from Compose.
- Added focused Game e2e tests for wallet-confirmed bet acceptance, wallet timeout without bet
  acceptance, insufficient balance, duplicate bet, invalid phase/amount, cashout acceptance,
  cashout rejection after crash, verification metadata, and interrupted-round reconciliation.
- Added Wallet e2e tests for idempotent `seed_credit`, `debit_bet`, `credit_payout`, and stable
  insufficient-balance rejection without negative balances.
- Added a Game message receipt test proving duplicate wallet result messages are ignored after the
  first receipt is recorded.
- Added `specs/003-challenge-polish-operational-confidence/` with spec, plan, contracts,
  data-model, and tasks artifacts.
- Added root evaluator scripts:
  - `npm run demo:up` starts/verifies Docker Compose, reruns migrations safely, polls health and
    frontend reachability, waits for Keycloak token readiness, and prints demo URLs/credentials.
  - `npm run smoke:api` acquires a Keycloak token, creates/reads the wallet, places a bet through
    Kong, performs a deterministic cashout/crash path, checks wallet/history/player-bet state, and
    recomputes provably fair verification.
- Added `DEMO_DETERMINISTIC_ROUNDS` support in the Games service. The normal `bun run docker:up`
  path keeps it disabled; `demo:up` intentionally enables it for local evaluator smoke.
- Added concise single-line lifecycle logs for Game startup/reconciliation/round transitions,
  wallet effects, RabbitMQ publish/consume, Wallet operations, and auth acceptance/rejection.
- Added frontend telemetry in a functional style: pure event formatting plus a console emitter for
  auth, API, WebSocket, refresh, bet, cashout, and manual round-control events. Browser logs avoid
  bearer tokens, authorization codes, PKCE verifiers, and secrets.
- Documented the evaluator runbook, Keycloak warmup notes, PowerShell/Bash command variants, and
  manual Keycloak PKCE browser checklist. The README now distinguishes normal local play via
  `bun run docker:up` from deterministic evaluator smoke via `npm run demo:up`.
- Added `specs/004-server-authoritative-auto-cashout/` with spec, plan, contracts, data-model, and
  tasks artifacts.
- Implemented server-authoritative auto-cashout as a Phase 4 differentiator:
  - `POST /games/bet` accepts optional nullable `autoCashoutMultiplierBps`.
  - Valid targets are `11000` through `1000000` basis points.
  - The Game domain stores the target on the bet and records `cashoutTrigger` as `manual` or
    `auto` when cashout succeeds.
  - The round runner evaluates eligible auto-cashouts before publishing the next visible multiplier
    tick; target equal to or above crash loses.
  - Manual and automatic cashout share the same pending-bet transition and the same stable
    `payout-credit:{roundId}:{betId}` Wallet idempotency key.
  - Game MikroORM persistence adds nullable `auto_cashout_multiplier_bps` and `cashout_trigger`
    fields on `bets`.
  - The frontend adds a compact auto-cashout toggle/target input and displays pending targets plus
    manual/auto cashout results.
- Implemented procedural crash mountain and goat-angle polish as a frontend-only Phase 4
  differentiator:
  - `displayedMultiplierBps` maps through a pure visual projection helper with a `3.00x` visual
    ceiling, bounded coordinates, sampled path points, and tangent angle clamps.
  - `GameScene` renders a procedural SVG mountain route plus a highlighted right-to-left trail
    using the same curve samples that position the goat.
  - The goat keeps the existing idle/run/jump sprite states while rotating by the local curve slope.
  - The multiplier text remains prominent and accessible; backend crash math, runner semantics,
    cashout, auto-cashout, Wallet, RabbitMQ, auth, persistence, public API contracts, and demo
    commands are unchanged.
- Implemented read-only leaderboard and richer history as a Phase 4 evaluator-inspection
  differentiator:
  - `GET /games/rounds/history` now returns completed-round summaries with accepted/cashed/lost
    counts, total wagered/payout cents, verification availability, and notable cashouts.
  - `GET /games/leaderboard` returns deterministic realized-cashout rankings by payout or
    cashout multiplier, excluding pending/lost bets and active/unrevealed rounds.
  - `GET /games/bets/me` returns the authenticated player's bet history with round outcome,
    crash multiplier, optional auto target, payout, and manual/auto trigger.
  - Frontend TanStack Query reads render compact History, Leaderboard, and My bets rows with
    shortened public player identifiers and no social/profile/admin surface.
  - `npm run smoke:api` now asserts enriched history, player bet read models, and leaderboard
    compatibility in addition to the existing wallet/game/verification path.
- Refined the procedural mountain UI after Docker validation:
  - The revealed mountain now starts lower and farther left, with denser sampled points and filled
    terrain under the ridge.
  - The goat starts at the ridge base, stays slightly behind the revealed ridge tip during the run,
    and uses an inverted visual rotation so it leans back into the climb.
  - WebSocket multiplier ticks remain authoritative, while the frontend interpolates
    `displayedMultiplierBps` toward a target value with `requestAnimationFrame` for smoother ridge,
    fill, zoom, and goat redraws between backend ticks.
  - Docker Compose now exposes optional runner overrides (`ROUND_RUNNER_TICK_MS`,
    `ROUND_BETTING_TICKS`, `ROUND_MULTIPLIER_STEP_BPS`) so evaluators can slow local visual testing
    without changing default gameplay behavior.
  - Goat placement now derives from the already revealed ridge polyline with a short visual delay
    behind the active tip; goat angle is calculated from that delayed point toward a lookahead point
    on the same drawn line. The frontend also supports `?debug=true` to show line/goat projection
  coordinates and angle in the mountain scene.
- Applied punctual UI/gameplay corrections before starting the next spec:
  - Current bets now sits in the right rail under the round summary with a compact bounded height.
  - Leaderboard/history/my-bets cards remain readable below the core scene instead of making the
    current-bets empty state dominate the page.
  - My bets and verification now stack at full left-column width beneath leaderboard on desktop,
    avoiding a large empty left gutter while preserving the stacked mobile layout.
  - Manual Start/Crash/Next controls now refresh round, wallet, history, leaderboard, and player bet
    read queries after success.
  - The frontend display multiplier now interpolates toward the latest server WebSocket multiplier
    target, and crashed rounds snap the display to the actual crash multiplier.
  - Docker/local runner defaults use `ROUND_RUNNER_TICK_MS=250`, `ROUND_BETTING_TICKS=12`, and
    `ROUND_MULTIPLIER_STEP_BPS=750` so browser play does not sit at `1.00x` for an extended betting
    window and then jump through the climb in large visible increments.

## Latest Validation

- Read the official challenge README from the cloned scaffold.
- Inspected root `package.json`, `docker-compose.yml`, and both service package manifests.
- Confirmed scaffold contains `services/games`, `services/wallets`, `docker`, `frontend`, and
  `packages`.
- Ran `docker compose config` successfully after switching Compose service env files to the tracked
  `.env.example` files. Docker emitted warnings about access to `C:\Users\guilherme\.docker\config.json`,
  but the Compose config rendered successfully.
- `bun install` completed successfully after installing Bun and loading it from `$HOME/.bun/bin`.
- Ran `npm.cmd install` successfully to install workspace dependencies for local type/build checks.
  It reported 12 npm audit findings from dependency tree.
- Ran `npx.cmd tsc -p services\games\tsconfig.json --noEmit` successfully.
- Ran `npx.cmd tsc -p services\wallets\tsconfig.json --noEmit` successfully.
- Ran `npx.cmd tsc -p frontend\tsconfig.json --noEmit` successfully.
- Ran `npm.cmd --workspace frontend run build` successfully outside the sandbox after Vite/esbuild
  hit sandbox access restrictions.
- Re-ran `npx.cmd tsc -p services\games\tsconfig.json --noEmit` successfully after adding
  application ports, in-memory adapters, and Swagger docs.
- Re-ran `npx.cmd tsc -p services\wallets\tsconfig.json --noEmit` successfully after adding
  application ports, in-memory adapters, and Swagger docs.
- Re-ran `npx.cmd tsc -p frontend\tsconfig.json --noEmit` successfully after adding
  history/player-bet/verification hooks and UI.
- Re-ran `npm.cmd --workspace frontend run build` successfully after frontend updates.
- Ran `docker compose version`; Docker Compose is available as `v5.1.3`.
- Ran `Get-Command bun,docker`; Docker is available, but Bun is still not installed in the current
  shell.
- Confirmed no previous constitution existed before creating the initial project constitution.
- Confirmed no previous `specs/` artifact existed before creating the first gameplay foundation
  spec.
- Inspected the NestJS scaffold, package manifests, and Docker Compose before planning.
- Ran architecture searches confirming domain folders do not import NestJS, MikroORM, RabbitMQ,
  WebSocket, controllers, or DTO types.
- Ran money/multiplier searches confirming current implementation uses cents and basis points
  naming.
- Ran `Get-Command bun,docker`; Docker is available, but Bun is still not installed in this shell.
- Ran `npx.cmd tsc -p services/games/tsconfig.json --noEmit` successfully after the Game
  application-layer slice.
- Ran `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` successfully after the Wallet
  application-layer slice.
- Ran `npx.cmd tsc -p frontend/tsconfig.json --noEmit` successfully after adding verification
  formula metadata to frontend types.
- Ran `npm.cmd --workspace frontend run build` successfully after the application-layer slice.
- Ran a domain boundary search for forbidden NestJS, MikroORM, RabbitMQ, WebSocket, controller, and
  DTO imports in `services/games/src/domain` and `services/wallets/src/domain`; no matches found.
- Ran `npm.cmd install --no-audit --no-fund` successfully after declaring the Games Socket.IO
  platform dependency.
- Ran `npm.cmd install --workspace frontend socket.io-client --no-audit --no-fund` successfully.
- Ran `npx.cmd tsc -p services/games/tsconfig.json --noEmit` successfully after persistence,
  RabbitMQ, auth, WebSocket, and runner changes.
- Ran `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` successfully after persistence,
  RabbitMQ, auth, and seed-credit changes.
- Ran `npx.cmd tsc -p frontend/tsconfig.json --noEmit` successfully after auth and Socket.IO client
  changes.
- Ran `npm.cmd --workspace frontend run build` successfully after the realtime/auth frontend
  changes.
- Ran `docker compose config` successfully; Docker still warned about access to
  `C:\Users\guilherme\.docker\config.json`, but config rendered.
- Attempted `docker compose up -d --build`; it failed because Docker Desktop's Linux engine pipe
  was unavailable (`dockerDesktopLinuxEngine` not found), so stack smoke, health checks, DB
  migrations, and gameplay smoke could not run here.
- Ran `npm.cmd --workspace frontend run test` outside the sandbox successfully after adding the auth
  helper test: 1 file, 2 tests passed.
- Re-ran domain boundary search after infrastructure additions; no forbidden imports appeared in
  either domain folder.
- Ran `npx.cmd tsc -p services/games/tsconfig.json --noEmit` successfully after the internal Wallet
  HTTP gateway, async wallet effects, crash-point-aware runner, and type-only import fixes.
- Ran `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` successfully after internal Wallet
  effect endpoints.
- Ran `npx.cmd tsc -p frontend/tsconfig.json --noEmit` successfully after goat sprite UI wiring.
- Ran `npm.cmd --workspace frontend run build` successfully after sprite assets and UI changes.
- Ran `npm.cmd --workspace frontend run test`: 1 file, 2 tests passed.
- Ran `cd services/games && "$HOME/.bun/bin/bun.exe" test tests/unit`: 8 tests passed.
- Ran `cd services/wallets && "$HOME/.bun/bin/bun.exe" test tests/unit`: 3 tests passed.
- Earlier, `cd services/games && "$HOME/.bun/bin/bun.exe" test tests/e2e` found no matching e2e
  test files. That gap was later closed by adding e2e tests and including test files in the Docker
  service build contexts.
- Rebuilt Docker images with `docker compose --progress=plain build games wallets frontend`
  successfully.
- Ran `docker compose up -d` successfully after Postgres init fixes; Postgres, RabbitMQ, Kong,
  Games, Wallets, and Frontend started.
- Validated `http://localhost:4001/health`, `http://localhost:4002/health`,
  `http://localhost:8000/games/health`, and `http://localhost:8000/wallets/health` successfully.
- Validated goat sprite asset serving through the frontend container:
  `http://localhost:3000/assets/goat/run.png` returned `200`.
- Ran local API smoke through Kong for player `codex-smoke-2`: wallet seed balance `100000`,
  after a `100` cent bet balance was `99900`, and the bet remained pending in the active round.
- Ran controlled payout smoke through direct service ports for player `codex-payout-2`: selected
  `round-20` with crash point `16127` bps, cashed out at `10000` bps, payout was `100` cents, and
  wallet balance returned from `100000` to `100000`.
- Ran `npx.cmd tsc -p services/games/tsconfig.json --noEmit` successfully after hardening changes.
- Ran `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` successfully after hardening
  changes.
- Ran `npx.cmd tsc -p frontend/tsconfig.json --noEmit` successfully after Keycloak/dev auth UI
  changes.
- Ran `npm.cmd --workspace frontend run test`: 1 file, 3 tests passed.
- Ran `npm.cmd --workspace frontend run build` successfully.
- Ran `docker compose config` successfully.
- Ran `docker compose up -d --build`; migrations ran automatically before Games/Wallets startup.
- Re-ran `docker compose run --rm games-migrations` and
  `docker compose run --rm wallets-migrations`; both reported successfully migrated to the latest
  version without reapplying work.
- Validated health through direct ports and Kong:
  `http://localhost:4001/health`, `http://localhost:4002/health`,
  `http://localhost:8000/games/health`, and `http://localhost:8000/wallets/health`.
- Retrieved a real Keycloak direct-grant token for test user `player` and used it to seed/read
  Wallet through Kong. Browser PKCE login still needs manual validation because the Keycloak
  container intermittently reported unhealthy/blocked-thread warnings.
- Smoke-tested RabbitMQ bet debit confirmation with bearer auth: a new smoke player seeded at
  `100000`, placed a `250` cent bet, Game accepted the bet, and Wallet balance became `99750`.
- Confirmed Wallet PostgreSQL ledger contains `seed_credit` and `debit_bet` records for smoke
  players.
- Ran domain boundary search for forbidden NestJS, MikroORM, RabbitMQ, WebSocket, controller, and
  DTO imports in Game/Wallet domain folders; no matches.
- Ran money arithmetic search; money paths still use integer cents/value objects and SQL
  constraints.
- Attempted `docker compose run --rm games bun test tests/unit` and
  `docker compose run --rm wallets bun test tests/unit`; both failed because the service
  `.dockerignore` excludes `tests/` and `*.test.ts` from the image, so Bun found no matching test
  files. Host Bun is not on the current PowerShell PATH.
- Final hardening validation on June 20, 2026:
  - `docker compose config --quiet` rendered successfully; Docker still warned about access to
    `C:\Users\guilherme\.docker\config.json`.
  - `docker compose up -d --build` rebuilt and started the stack; Games, Wallets, Kong, RabbitMQ,
    PostgreSQL, Frontend, and Keycloak reached usable/healthy state after Keycloak bootstrap.
  - Direct and Kong health checks passed for Games and Wallets.
  - Real Keycloak token flow passed with user `player` / `player123`.
  - Authenticated gameplay smoke through Kong passed: wallet seed `100000`, bet debit `250`,
    balance `99750`, cashout at `1.00x`, balance returned to `100000`, history updated, and
    verification metadata returned.
  - Keycloak mode rejected `x-player-id` without bearer token with `401`.
  - Two Socket.IO clients connected through Kong and converged on
    `round.started`, `round.crashed`, `round.settled`.
  - Playwright screenshots validated login and authenticated game UI at desktop `1440x900` and
    mobile `390x844`; goat/mountain rendering remained presentation-only.
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `docker compose run --rm games bun test tests/unit`: 10 tests passed.
  - `docker compose run --rm games bun test tests/e2e`: 5 tests passed.
  - `docker compose run --rm wallets bun test tests/unit`: 3 tests passed.
  - `docker compose run --rm wallets bun test tests/e2e`: 2 tests passed.
  - `npm.cmd --workspace frontend run test`: 5 tests passed.
  - `npm.cmd --workspace frontend run build` passed.
- Challenge polish validation on June 21, 2026:
  - `node --check scripts/demo-common.cjs` passed.
  - `node --check scripts/demo-up.cjs` passed.
  - `node --check scripts/smoke-api.cjs` passed.
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed after fixing a log field, then
    passed again after the RabbitMQ result listener race fix and `round.betting.opened` log.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `docker compose build games` passed after adding the deterministic seed/logging/RabbitMQ
    listener changes.
  - `docker compose build wallets` passed after adding Wallet logging helper/tests.
  - `npm run demo:up` passed on an already-running stack, reran both migrations as no-ops, waited
    for direct/Kong health, frontend reachability, and Keycloak token readiness, then printed demo
    URLs, health URLs, credentials, realm/client, and next commands.
  - `npm run smoke:api` initially exposed a transient Kong DNS readiness window, a Game RabbitMQ
    result-listener race, and a runner/manual-settle timing edge. After adding consecutive Kong
    health gates, awaiting result listener registration before publish, and making smoke settlement
    tolerant of the runner, `npm run smoke:api` passed with player
    `d93bc39e-5cce-4f14-8123-bcf033152223`, round `round-1782051476722`, bet
    `bet-d93bc39e-5cce-4f14-8123-bcf033152223-1782051477261-2`, `250` cent bet,
    `10000` bps cashout, `46624` bps crash, final balance equal to starting balance, and
    `verificationMatched: true`.
  - `docker compose run --rm games bun test tests/unit` passed on the current image: 10 tests.
  - `docker compose run --rm games bun test tests/unit` passed after rebuild: 13 tests.
  - `docker compose run --rm games bun test tests/e2e` passed after rebuild: 5 tests.
  - `docker compose run --rm wallets bun test tests/unit` passed after rebuild: 4 tests.
  - `docker compose run --rm wallets bun test tests/e2e` passed after rebuild: 2 tests.
  - `docker compose config --quiet` passed; Docker still warned about access to
    `C:\Users\guilherme\.docker\config.json`.
  - `npm.cmd --workspace frontend run test` passed: 1 file, 7 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - Final domain boundary search found no forbidden NestJS, MikroORM, RabbitMQ, WebSocket,
    controller, DTO, browser, demo-script, or log-helper imports in Game/Wallet domain folders.
  - Final money arithmetic search confirmed wallet balances, bet amounts, debits, credits, payouts,
    and smoke assertions continue to use integer cents and multiplier basis points. Floating-point
    arithmetic remains isolated to provably-fair multiplier derivation and smoke recomputation.
- Frontend telemetry follow-up on June 21, 2026:
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed after adding functional telemetry.
  - `npm.cmd --workspace frontend run test` passed: 2 files, 9 tests.
- Auto-cashout implementation validation on June 21, 2026:
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `bun test tests/unit` in `services/games` passed: 18 tests.
  - `bun test tests/e2e` in `services/games` passed: 6 tests.
  - `bun test tests/unit` in `services/wallets` passed: 4 tests.
  - `bun test tests/e2e` in `services/wallets` passed: 2 tests.
  - `npm.cmd --workspace frontend run test` passed: 3 files, 12 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - `docker compose config --quiet` passed; Docker still warned about access to
    `C:\Users\guilherme\.docker\config.json`.
  - Domain boundary search found no forbidden infrastructure/framework/DTO imports in Game/Wallet
    domain folders.
  - Money arithmetic search confirmed bet amounts, debits, payouts, wallet balances, and
    auto-cashout targets remain integer cents and multiplier basis points. Floating-point arithmetic
    remains isolated to display formatting and provably-fair crash derivation.
  - After Docker Desktop was started, `docker compose run --rm games bun test tests/unit` passed:
    18 tests.
  - `docker compose run --rm games bun test tests/e2e` passed: 6 tests.
  - `docker compose run --rm wallets bun test tests/unit` passed: 4 tests.
  - `docker compose run --rm wallets bun test tests/e2e` passed: 2 tests.
  - `docker compose run --rm games-migrations` applied
    `Migration202606210001_AddAutoCashoutToBets`; a repeat run reported latest version.
  - `npm.cmd run demo:up` passed and printed the evaluator URLs/credentials.
  - `npm.cmd run smoke:api` passed after tightening the smoke harness to synchronize with the live
    round runner instead of assuming the current round phase remains stable between helper calls.
  - Docker validation exposed and fixed a persistence bug where `saveCurrent` could reinsert bet
    rows for an already-recorded crashed round; the MikroORM repository now deletes by stable
    `round_id` before reinserting the current snapshot.
- Procedural mountain implementation validation on June 21, 2026:
  - `npm.cmd --workspace frontend run test` passed: 4 files, 19 tests.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run build` passed.
  - Vite dev server initially hit sandbox file access restrictions; rerunning outside the sandbox
    in `VITE_AUTH_MODE=dev` succeeded for browser screenshots.
  - Playwright captured mobile game-scene validation at `390x844`:
    `output/playwright/mobile-005-game.png`.
  - Playwright viewport desktop capture at `1440x900` hit a transient
    `Page.captureScreenshot` protocol error after the final base-point adjustment, but full-page
    desktop capture succeeded: `output/playwright/desktop-005-game-full.png`.
  - Desktop and mobile screenshots showed the goat visible at the base, a curved procedural path,
    tangent rotation, prominent multiplier text, and no incoherent overlap with wallet, bet
    controls, current bets, history, or verification.
  - First `npm.cmd run smoke:api` attempt failed because the stack was not reachable; `npm.cmd run
    demo:up` then succeeded and printed evaluator URLs/credentials.
  - A subsequent `npm.cmd run smoke:api` hit a transient Kong `wallets/me` upstream name-resolution
    `503`; a retry passed with `verificationMatched: true`.
- Read-only leaderboard/history implementation validation on June 21, 2026:
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace @crash/games run test` passed: 23 tests.
  - `npm.cmd --workspace @crash/games run test:e2e` passed: 6 tests.
  - `npm.cmd --workspace @crash/wallets run test` passed: 4 tests.
  - `npm.cmd --workspace @crash/wallets run test:e2e` passed: 2 tests.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 24 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - `docker compose config --quiet` passed.
  - `docker compose build games games-migrations frontend` passed.
  - `npm.cmd run demo:up` passed and reran migrations as no-ops.
  - `npm.cmd run smoke:api` passed with enriched history/player-bet/leaderboard assertions and
    `verificationMatched: true`.
  - `docker compose run --rm games bun test tests/unit` passed: 23 tests.
  - `docker compose run --rm games bun test tests/e2e` passed: 6 tests.
  - `docker compose run --rm wallets bun test tests/unit` passed: 4 tests.
  - `docker compose run --rm wallets bun test tests/e2e` passed: 2 tests.
  - Final domain boundary search found no forbidden framework, persistence, RabbitMQ, Socket.IO,
    controller, DTO, demo, browser, or log-helper imports in Game/Wallet domain folders.
  - Final money search confirmed leaderboard/history aggregates use integer cents and multiplier
    basis points; floating point remains isolated to display formatting and provably-fair math.
  - Playwright desktop/mobile screenshots passed in dev-auth mode:
    `output/playwright/desktop-006-game.png`, `output/playwright/mobile-006-game.png`, and
    `output/playwright/mobile-006-game-full.png`. The first sandboxed Playwright attempts hit npm
    cache/registry access restrictions; rerunning with approved escalation succeeded.
- Implemented frontend presentation/onboarding polish as a Phase 4 user-experience differentiator:
  - The first unauthenticated visit shows a polished thank-you modal for Jungle Gaming before the
    visual-novel dialogue introduces Nina the climbing goat and frames the goal of helping her climb
    the mountain.
  - The login screen now uses a Jungle Crash-owned panel and button copy while still starting the
    existing Keycloak authorization-code/PKCE redirect instead of collecting credentials in React.
  - A Zustand dialogue store owns welcome/tutorial completion flags, dialogue queue state,
    typewriter timing, command-modal prompt state, and friendly phase/cashout messages.
  - After login, a mini tutorial explains betting, running/cashout, history/verification, then
    opens the keyboard command modal automatically.
  - Keyboard shortcuts avoid common browser command chords and ignore editable fields: `Enter`
    advances dialogue, `H` help, `B` bet, `C` cashout, `A` auto-cashout toggle, and `[` / `]`
    amount adjustment.
- Frontend login/control cleanup follow-up:
  - Removed the dev identity / bearer-token form from the game controls so the user-facing frontend
    stays Keycloak-only.
  - Removed manual Start/Crash/Next browser controls and made unauthenticated sessions start the
    Keycloak PKCE redirect automatically.
  - Moved the command modal button from the betting panel into the top action area beside the title
    and session card.
  - Added a persisted wallet-balance visibility toggle with an eye-style button; hidden balances
    render as masked dots.
  - Validation: `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed;
    `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests;
    `npm.cmd --workspace frontend run build` passed.
- Dialogue state follow-up:
  - Friendly phase/cashout dialogue now considers the authenticated player's current-round bet
    status in addition to the global round phase, so cashout and active-bet guidance only appears
    when the user actually has a pending or cashed-out bet in the current round.
  - Validation: `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed;
    `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests;
    `npm.cmd --workspace frontend run build` passed.
- Browser bet placement reliability follow-up on June 22, 2026:
  - Fixed a real RabbitMQ/Wallet timing edge where browser bet submission could timeout in Games
    while Wallet later accepted the debit, leaving the player charged without an accepted bet.
  - Games now re-reads the current round after Wallet debit confirmation before persisting the bet;
    if the betting window closed or moved to another round, Games requests an idempotent refund
    credit and rejects with a clear refunded-window message instead of saving a stale bet.
  - Local Docker defaults keep a larger Wallet result budget with `WALLET_RESULT_TIMEOUT_MS=25000`;
    later playability tuning returned the betting window to `ROUND_BETTING_TICKS=12` and slowed
    running ticks to `ROUND_MULTIPLIER_STEP_BPS=750`.
  - The frontend bet button now shows a pending confirmation label, blocks duplicate active bets,
    and displays mutation errors near the bet controls.
  - Validation: `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed;
    `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed;
    `npm.cmd --workspace @crash/games run test:e2e` passed: 7 tests;
    `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests;
    `npm.cmd --workspace frontend run build` passed. `docker compose build games` passed, but the
    local Docker CLI became slow/stuck while checking container status after recreating `games`, so
    a live browser/API bet smoke could not be completed in this turn.
- Frontend localization follow-up:
  - Player-facing copy now targets Brazilian Portuguese for layout sections, controls, empty
    states, outcome labels, connection/phase/cashout statuses, pre-login copy, document language,
    and displayed currency.
  - The top command button intentionally remains `Show commands` per the latest product request.
  - Validation: `npx.cmd tsc -p frontend\tsconfig.json --noEmit` passed;
    `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests;
    `npm.cmd --workspace frontend run build` passed.
- Provably fair crash distribution follow-up on June 22, 2026:
  - Fixed the HMAC sample normalization denominator to match the 13 hex characters/52-bit sample
    used by the crash calculation. The previous 53-bit denominator capped generated crash points
    below `2.00x`.
  - Updated the smoke verification formula and deterministic demo expectation; the standard demo
    round now verifies at `46624` bps instead of `16332` bps.
- Docker readiness follow-up on June 22, 2026:
  - Reproduced clean-stack failures where Games/Wallets exited after RabbitMQ returned Compose
    `healthy` but refused AMQP connections on `5672`.
  - Updated RabbitMQ health to verify the AMQP listener and added bounded RabbitMQ connection
    retries to Games/Wallets adapters.
  - `docker compose config --quiet` passed.
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `docker compose build games wallets games-migrations wallets-migrations` passed.
  - `docker compose down --remove-orphans -v` followed by `npm.cmd run demo:up` passed from a
    clean stack and printed evaluator URLs/credentials.
  - `npm.cmd run smoke:api` passed with deterministic crash `46624` bps and verified wallet,
    cashout, enriched history/player-bet/leaderboard, and provably fair checks.
- Procedural mountain alignment follow-up on June 22, 2026:
  - `npm.cmd --workspace frontend run test` passed: 32 tests.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `docker compose build frontend` and `docker compose up -d frontend` passed.
  - Goat rendering was moved into the procedural SVG/viewBox and anchored to the same delayed ridge
    point used by `?debug=true`, removing the separate absolute-positioned sprite layer that drifted
    from the curve under responsive scaling.
  - The shared SVG world now applies multiplier-driven zoom with a mobile zoom boost, and mobile
    scene feedback was repositioned so it does not overlap the large multiplier.
  - `npm.cmd --workspace frontend run test` passed: 33 tests.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run build` passed.
- Presentation/onboarding polish validation on June 22, 2026:
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - Follow-up validation after adding the opening thank-you modal and `Enter` dialogue shortcut:
    `npm.cmd --workspace frontend run test` passed: 6 files, 33 tests; `npm.cmd --workspace
    frontend run build` passed.
  - Vite keycloak-mode local preview at `http://127.0.0.1:5173` rendered the first-run welcome
    hero and typewriter dialogue; Playwright screenshot:
    `output/playwright/onboarding-dialogue.png`.
  - Vite dev-auth local preview at `http://127.0.0.1:5173` rendered the authenticated game screen
    with command entry point; Playwright screenshot:
    `output/playwright/dev-game-dialogue.png`.
  - The dev-auth preview did not trigger the post-login tutorial because no local backend snapshot
    was available in that isolated frontend-only run; the tutorial remains gated on a loaded round
    to avoid presenting gameplay instructions over missing state.
- Punctual leaderboard/layout/crash-cadence follow-up on June 22, 2026:
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 33 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - `docker compose config --quiet` passed.
  - Vite dev server in dev-auth mode passed Playwright screenshot checks:
    `output/playwright/desktop-punctual-fixes.png`,
    `output/playwright/mobile-punctual-fixes.png`,
    `output/playwright/desktop-punctual-fixes-full.png`, and
    `output/playwright/mobile-punctual-fixes-full.png`.
- Realtime multiplier playability correction on June 22, 2026:
  - Fixed the browser-visible stall/teleport behavior by applying current-round multiplier ticks
    directly in the Zustand game store and by publishing round snapshots on `round.started`,
    `round.crashed`, `round.settled`, `round.betting.opened`, `bet.accepted`, and
    `cashout.accepted`.
  - Corrected the frontend listener from `round.betting_opened` to `round.betting.opened` and made
    `settleAndCreateNextRound` emit that event with the next betting round snapshot.
  - Aligned Docker and service defaults to `ROUND_RUNNER_TICK_MS=250`,
    `ROUND_BETTING_TICKS=12`, and `ROUND_MULTIPLIER_STEP_BPS=750`.
  - Validation: `npm.cmd run test -w frontend` passed: 7 files, 35 tests;
    `npm.cmd run test:e2e -w @crash/games` passed: 8 tests;
    `npm.cmd run test -w @crash/games` passed: 24 tests;
    `npm.cmd run build -w frontend` passed.
- Multiplier smoothness hotfix on June 22, 2026:
  - `VITE_SOCKET_PATH` can now override the Socket.IO path; the default remains `/games/socket`
    through Kong and falls back to `/socket` when targeting the Games service port directly.
  - Socket.IO now allows polling fallback in addition to WebSocket, preventing a proxy/upgrade
    issue from reducing the browser to stale HTTP polling snapshots.
  - The running-phase animation loop reads the latest multiplier target from refs and advances the
    displayed multiplier with a runner-speed fallback estimate capped by the crash point, so the
    scene does not visually freeze at `1.00x` if a tick is delayed.
  - Validation: `npm.cmd run test --workspace frontend -- --run src/stores/game-store.test.ts
    src/services/api.test.ts` passed: 2 files, 5 tests; `npm.cmd run build --workspace frontend`
    passed. Initial `npm run typecheck --workspace frontend` was not applicable because the
    frontend package has no `typecheck` script.
- Panel fill follow-up on June 22, 2026:
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run build` passed.
  - Vite dev-auth Playwright screenshots passed:
    `output/playwright/desktop-panel-fill-fix-full.png` and
    `output/playwright/mobile-panel-fill-fix-full.png`.
- Keycloak-only browser auth follow-up on June 22, 2026:
  - Removed the frontend dev identity form, `x-player-id` browser request behavior, and manual
    Start/Crash/Next controls from the React app.
  - Unauthenticated browser sessions and API `401` responses now show a login-required modal with a
    Keycloak button and a 10-second automatic redirect countdown before starting the existing PKCE
    flow.
  - The login starter now checks Keycloak readiness before navigating; if Keycloak is unreachable,
    the modal stays visible with a retryable error instead of leaving the browser loading without
    context.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 33 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - Local operational note: during validation, `localhost:8080` timed out and Keycloak logs showed
    blocked threads plus connection acquisition timeout. `docker compose restart keycloak` reported
    the container PID was zombie; `docker kill jungle-gaming-keycloak-1` eventually removed it, but
    `docker compose up -d keycloak` did not restore a running service. Restart Docker Desktop before
    re-running browser PKCE smoke locally.
- Brazilian Portuguese UI localization follow-up on June 22, 2026:
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 32 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - Playwright screenshot against the running Vite preview captured the localized pre-login shell:
    `output/playwright/desktop-ptbr-ui.png`.
- CI/CD and browser auth smoke implementation on June 22, 2026:
  - Added `.github/workflows/ci.yml` with required push/PR jobs for frontend typecheck/test/build,
    Games and Wallets typecheck/unit/e2e tests, smoke script checks, `docker compose config
    --quiet`, Compose image builds, deterministic full-stack startup, API smoke, and browser
    Keycloak PKCE smoke.
  - Added root `npm run smoke:browser`, Playwright dependency, `scripts/smoke-browser.cjs`,
    secret-safe screenshot diagnostics under `output/playwright/`, and non-visual `data-smoke`
    selectors for the login-required modal and authenticated game shell panels.
  - Updated `npm run demo:up` output to suggest `npm run smoke:browser` after `npm run smoke:api`.
  - `node --check scripts/smoke-browser.cjs` passed.
  - `node --check scripts/demo-up.cjs` passed.
  - `npx.cmd playwright --version` passed: `Version 1.61.0`.
  - `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed.
  - `npx.cmd tsc -p services/wallets/tsconfig.json --noEmit` passed.
  - `npm.cmd --workspace frontend run test` passed: 6 files, 33 tests.
  - `npm.cmd --workspace frontend run build` passed.
  - `npm.cmd --workspace @crash/games run test` passed: 24 tests.
  - `npm.cmd --workspace @crash/games run test:e2e` passed: 7 tests.
  - `npm.cmd --workspace @crash/wallets run test` passed: 4 tests.
  - `npm.cmd --workspace @crash/wallets run test:e2e` passed: 2 tests.
  - `docker compose config --quiet` passed.
  - Guardrail searches found no Game/Wallet domain imports from Playwright, smoke scripts, Docker,
    CI, controllers, DTOs, NestJS, MikroORM, or RabbitMQ.
  - Guardrail searches found no new public auth bypass, static bearer token shortcut, browser dev
    identity control, or Wallet mutation shortcut from this slice. Matches were expected existing
    auth/token code, demo direct-grant API smoke, internal Wallet effect endpoints, and the new
    browser smoke's clean-context `jungle.accessToken` check.
  - CI hardening follow-up added read-only workflow permissions, concurrency cancellation, job
    timeouts, smoke script syntax checks, Compose image builds, a full-stack smoke job, Playwright
    Chromium installation, and failure artifact upload for Compose logs plus Playwright
    screenshots.
  - `npm.cmd run demo:up`, `npm.cmd run smoke:api`, and `npm.cmd run smoke:browser` were not rerun
    in this turn because the local environment became unusually slow during Bun test execution.
    The commands remain the required local follow-up for full-stack/browser proof.
- README run-mode documentation follow-up:
  - `README.md` now separates real/local play from demo/evaluator mode.
  - Real/local play uses `bun run docker:up` or `npm run docker:up` with
    `DEMO_DETERMINISTIC_ROUNDS=false` and natural server-derived crash points.
  - Demo/evaluator mode uses `npm run demo:up`, intentionally enables
    `DEMO_DETERMINISTIC_ROUNDS=true`, and documents the default deterministic crash point as
    `4.66x` (`46624` basis points) before `npm run smoke:api`.
- Final evaluator README closeout:
  - Rewrote `README.md` as a concise delivery runbook instead of an implementation history.
  - Documented prerequisites, tracked service `.env.example` usage, optional root `.env`
    overrides, fast evaluator run, demo mode, production-like local mode, stop/reset commands,
    validation commands, troubleshooting, local URLs, credentials, and deferred work.
  - This was documentation-only; application code, Docker services, public API contracts,
    RabbitMQ/WebSocket contracts, auth behavior, and gameplay behavior were not changed.
  - Validation was limited to reading the actual `package.json`, `docker-compose.yml`, service
    `.env.example` files, and smoke scripts before updating documentation. Full Docker/API/browser
    smoke was not rerun during this documentation-only closeout.
- Playability hotfix after local feedback:
  - Accepted bets now start as `ready=false`; authenticated players can call `POST /games/bet/ready`
    through the new **Pronto para comecar** frontend action.
  - The automatic round runner waits for every pending accepted bet to be marked ready before
    starting after the betting window. Empty betting rounds still advance automatically, and manual
    development start helpers remain available for smoke/setup flows.
  - Generated crash points stay below `14.00x` (`140000` basis points). Overflow outcomes are
    remapped deterministically below the ceiling instead of being pinned to exactly `14.00x`;
    provably fair verification and the API smoke recomputation path use the same rule.
  - Added a repeatable Game migration for the persisted bet `ready` flag.
  - Validation: `npx.cmd tsc -p services/games/tsconfig.json --noEmit` passed;
    `npx.cmd tsc -p frontend/tsconfig.json --noEmit` passed; `npm.cmd --workspace @crash/games
    run test` passed: 26 tests; `npm.cmd --workspace @crash/games run test:e2e` passed: 9 tests;
    `npm.cmd --workspace frontend run test` passed: 7 files, 35 tests; `npm.cmd --workspace
    frontend run build` passed; `node --check scripts/smoke-api.cjs` passed.
- Final shortcut/spec closeout on June 22, 2026:
  - Fixed the `C` cashout keyboard command so it still fires when focus remains in the bet amount
    or auto-cashout input after placing a bet. The cashout handler still requires the current round
    to be running and the authenticated player's bet to be pending.
  - Marked `specs/007-ci-cd-browser-auth-smoke/spec.md` and `plan.md` as implemented to match the
    already completed task list.
  - Updated `README.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md` so final delivery docs
    point to submission/post-submission hardening instead of reopening feature scope.

## Product Direction To Preserve

- DDD layers stay meaningful: domain rules do not depend on NestJS, MikroORM, RabbitMQ, WebSocket,
  controllers, or DTOs.
- Game and Wallet remain separate bounded contexts communicating through RabbitMQ for settlement
  flows.
- Money must never use floating point arithmetic.
- WebSocket is server-to-client push; player actions remain REST.
- UI feedback may be smooth and latency-aware, but cashout truth must always reconcile to the
  server result.
- Keep implementations simple, legible, and focused; avoid overengineering.
- Documentation should explain architectural trade-offs for the final challenge delivery.

## Pending Work

- No remaining blocking work for `specs/002-persistence-auth-e2e-hardening`.
- No remaining blocking work for `specs/003-challenge-polish-operational-confidence`.
- No remaining blocking work for `specs/007-ci-cd-browser-auth-smoke`. Browser PKCE automation is
  now available as `npm run smoke:browser` after `npm run demo:up`; full-stack/browser validation
  should be rerun after Docker Desktop/Keycloak are healthy.
- No remaining blocking work for the `C` cashout shortcut hotfix; frontend validation should be
  rerun after this closeout.
- No remaining blocking work for `specs/005-procedural-crash-mountain-goat-angle`.
- No remaining blocking work for `specs/006-read-only-leaderboard-history`.
- No remaining blocking work for the June 22 punctual leaderboard/layout/crash-cadence follow-up.
- No remaining blocking work for the multiplier smoothness hotfix; a live browser smoke with
  `npm run demo:up` is still recommended before submission to observe the real Kong/Keycloak stack.
- Procedural mountain visual review passed with Playwright screenshots in dev-auth mode before the
  auth UX correction; new browser play should be validated through Keycloak.
- Presentation/onboarding polish is complete as a frontend-only slice. Normal Keycloak browser PKCE
  remains manual as before, now reached from the login-required modal or its 10-second countdown
  when no token is present.
- Player-facing frontend localization to Brazilian Portuguese is complete for the currently visible
  game shell; future UI additions should keep this locale by default unless product copy explicitly
  says otherwise.
- The README/evaluator runbook closeout is now documented. Before submitting, the preferred final
  local confidence pass is still: `npm run demo:up`, `npm run smoke:api`, and optionally
  `npm run smoke:browser` if Docker Desktop and Playwright/Chromium are healthy.
- Defer durable outbox/inbox, broad Playwright regression tests, sound effects, and deeper
  observability unless a new requirement justifies them.

## Recommended Next Spec Kit Step

No new feature spec is required to submit this challenge. If work continues after delivery, use
`docs/next-spec-prompt.md` for a post-submission hardening pass focused on final smoke evidence,
known caveats, and deferred production-readiness items.

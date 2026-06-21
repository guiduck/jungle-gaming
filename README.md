# Jungle Crash Game

Full-stack senior challenge based on the Jungle Gaming crash game repository.

The product is a real-time multiplayer crash game: players bet before the round starts, watch a
multiplier rise from `1.00x`, and must cash out before the server-side crash point. This
implementation will keep the betting/game engine authoritative on the backend and render the crash
experience as a goat climbing a mountain in the frontend.

## Stack Direction

- Runtime: Bun.
- Backend: NestJS + TypeScript strict.
- Persistence: PostgreSQL + MikroORM.
- Messaging: RabbitMQ.
- Gateway: Kong.
- Identity provider: Keycloak.
- Frontend: Vite + React + Tailwind CSS v4 + shadcn/ui.
- State: TanStack Query for server state, Zustand for hot game state.
- Local delivery: Docker Compose.

## Why MikroORM

MikroORM is selected because the challenge heavily evaluates DDD, aggregates, invariants, and
service boundaries. It lets the services model `Round`, `Bet`, and `Wallet` as rich domain classes
while keeping persistence details in infrastructure repositories.

See `docs/architecture-decisions.md` for the full Prisma and TypeORM trade-off.

## Current Status

The official challenge scaffold has been imported into this repository root:

- `services/games`: NestJS Game Service with DDD domain primitives, application ports/use cases,
  in-memory round adapter, MikroORM mapping/migration files, internal Wallet HTTP gateway for local
  debit/credit confirmation, RabbitMQ adapter classes, WebSocket event gateway, crash-point-aware
  round runner, core REST endpoints, Swagger docs, and domain tests.
- `services/wallets`: NestJS Wallet Service with DDD wallet domain, application ports/use cases,
  in-memory wallet and operation adapters, MikroORM mapping/migration files, RabbitMQ consumer/result
  publisher classes, seed-credit wallet bootstrap, public create/read endpoints, Swagger docs, and
  domain tests.
- `docker`: Kong, Keycloak, and PostgreSQL support files.
- `frontend`: Vite React game UI with TanStack Query hooks for wallet/current round/history/player
  bets/verification, Zustand, cropped goat run/jump/idle sprites in the mountain scene, and concise
  browser console telemetry for auth/API/WebSocket/gameplay events.
- `packages/contracts`: minimal shared RabbitMQ event and socket contract types.

Project-specific planning lives in `docs/` and `specs/`.

The `002-persistence-auth-e2e-hardening` implementation is complete for local challenge delivery.
Docker/local defaults target PostgreSQL persistence, RabbitMQ wallet effects, and Keycloak auth
mode. Migrations run automatically through one-shot Compose services before Games and Wallets
start. MikroORM runtime repositories are wired for both services, Wallet balance/operation writes
use a single MikroORM transaction, Game restart reconciliation terminalizes stale active rounds
without deleting player-visible participation, and automated/containerized tests cover the critical
money/game paths.

Swagger/OpenAPI is exposed at:

- Games: `http://localhost:4001/docs`
- Wallets: `http://localhost:4002/docs`

## Local Commands

```bash
bun install
bun run docker:up
bun run docker:down
bun run docker:prune
```

If Git Bash does not find Bun after install, use `"$HOME/.bun/bin/bun.exe"` directly or add
`$HOME/.bun/bin` to your shell PATH.

## Playing Locally

Use the normal Docker path when you want to actually play with natural server-side crash points:

```bash
bun run docker:up
```

PowerShell:

```powershell
bun run docker:up
```

Then open `http://localhost:3000`, click **Login with Keycloak**, and use:

- Username: `player`
- Password: `player123`

This normal play path keeps `DEMO_DETERMINISTIC_ROUNDS=false`, so each round uses the regular
server-derived seed/nonce path and remains server-authoritative. The Wallet still receives the
local `seed_credit` bootstrap for the demo user, but bet debit, cashout payout, history, and
verification all flow through the PostgreSQL/RabbitMQ-backed services.

Use `npm run demo:up` when you want the evaluator/demo harness and deterministic API smoke. That
command intentionally enables `DEMO_DETERMINISTIC_ROUNDS=true` for repeatable validation; it is not
the default gameplay mode.

To inspect local telemetry while playing, open the browser developer console. Frontend events are
logged as one-line records such as `event=api.request.completed service=frontend ...`,
`event=socket.event.received service=frontend ...`, and `event=cashout.submit.accepted
service=frontend ...`.

## Evaluator Demo Commands

Use the demo wrapper when reviewing the challenge locally. It starts or verifies Docker Compose,
reruns migrations safely, waits for health, and prints URLs plus local credentials:

```bash
npm run demo:up
```

PowerShell uses the same command:

```powershell
npm.cmd run demo:up
```

The demo wrapper intentionally starts the Games service with `DEMO_DETERMINISTIC_ROUNDS=true` so
the API smoke can use a repeatable provably-fair round. The normal `bun run docker:up` path keeps
`DEMO_DETERMINISTIC_ROUNDS=false`.

After the stack is healthy, run the fast API smoke:

```bash
npm run smoke:api
```

PowerShell:

```powershell
npm.cmd run smoke:api
```

The smoke acquires a Keycloak token for the local demo user, verifies health, seeds/reads the
wallet through public routes, places a bet through Kong, cashes out or validates a deterministic
crash path, checks wallet/history/player-bet state, and recomputes provably fair verification.

Browser PKCE validation remains a manual/optional polish check for this slice:

1. Open `http://localhost:3000`.
2. Log in through Keycloak with `player` / `player123`.
3. Confirm the UI shows Keycloak identity, wallet state, round phase, bet/cashout controls,
   history, verification, and WebSocket status.
4. Check desktop and mobile widths if visual validation is required.

Useful local URLs:

- Frontend: `http://localhost:3000`
- Kong: `http://localhost:8000`
- Games Swagger: `http://localhost:4001/docs`
- Wallets Swagger: `http://localhost:4002/docs`
- Keycloak: `http://localhost:8080`
- Games health: `http://localhost:4001/health` and `http://localhost:8000/games/health`
- Wallets health: `http://localhost:4002/health` and `http://localhost:8000/wallets/health`

Known startup note: Keycloak can take longer than the other containers on first boot while the realm
imports. If `demo:up` is still waiting, inspect:

```bash
docker compose logs --tail 120 keycloak
docker compose ps
```

PowerShell:

```powershell
docker compose logs --tail 120 keycloak
docker compose ps
```

If Docker is installed but unavailable, start Docker Desktop and retry. A quick diagnostic is:

```bash
docker compose version
docker info
```

Service-level test commands from the scaffold:

```bash
docker compose run --rm games bun test tests/unit
docker compose run --rm wallets bun test tests/unit
docker compose run --rm games bun test tests/e2e
docker compose run --rm wallets bun test tests/e2e
```

MikroORM migration commands, once the Docker stack/PostgreSQL are running:

```bash
cd services/games && bun run migration:up
cd services/wallets && bun run migration:up
```

From the host PowerShell, override the Docker-only hostname:

```powershell
$env:POSTGRES_HOST='localhost'
npm.cmd --workspace @crash/games run migration:up
npm.cmd --workspace @crash/wallets run migration:up
Remove-Item Env:\POSTGRES_HOST
```

In Docker Compose these commands run automatically through `games-migrations` and
`wallets-migrations`. A first run applies the existing migrations; repeated runs should print
`Successfully migrated up to the latest version` without reapplying work.

Mini MikroORM workflow:

```bash
# inspect the service config used by the CLI
cd services/games
bun run migration:up

# after changing schema/entity mappings, generate a new migration from that service folder
bunx mikro-orm migration:create --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts

# repeat the same pattern in services/wallets for wallet schema changes
```

Tracked Docker defaults:

- `PERSISTENCE_ADAPTER=postgres`
- `WALLET_EFFECT_ADAPTER=rabbitmq`
- `AUTH_MODE=keycloak`

Explicit dev/smoke modes remain available through env overrides: `PERSISTENCE_ADAPTER=memory`,
`WALLET_EFFECT_ADAPTER=internal-http|immediate`, and `AUTH_MODE=dev`.

Additional validation used during this implementation slice:

```bash
npx.cmd tsc -p services/games/tsconfig.json --noEmit
npx.cmd tsc -p services/wallets/tsconfig.json --noEmit
npx.cmd tsc -p frontend/tsconfig.json --noEmit
npm.cmd --workspace frontend run build
npm.cmd --workspace frontend run test
docker compose config
docker compose --progress=plain build games wallets frontend
docker compose up -d
docker compose ps
```

Keycloak local login:

- Frontend: `http://localhost:3000`
- Test user: `player`
- Test password: `player123`
- Realm/client: `crash-game` / `crash-game-client`

The normal UI path is Keycloak. The local `x-player-id` fallback only works when services/frontend
are intentionally started with `AUTH_MODE=dev` / `VITE_AUTH_MODE=dev`, and the UI labels that mode
as `Dev identity`.

## Documentation Map

- `docs/overview.md`: product overview and player flow.
- `docs/vision.md`: target outcome and principles.
- `docs/architecture.md`: stack, DDD layering, service boundaries, and state strategy.
- `docs/domain-model.md`: entities, value objects, lifecycle, and invariants.
- `docs/reference-ui.md`: goat/mountain UI direction.
- `docs/architecture-decisions.md`: accepted architecture decisions and trade-offs.
- `docs/roadmap.md`: phased delivery plan.
- `docs/handoff.md`: current status and next work.
- `docs/next-spec-prompt.md`: command-ready prompt for the next `/speckit-specify`.

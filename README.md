# Jungle Crash Game

Jungle Crash Game is a real-time multiplayer crash betting game built for the Jungle Gaming
full-stack senior challenge.

The backend is authoritative for rounds, bets, cashout, wallet settlement, and provably fair crash
verification. The frontend renders the game as a goat climbing a mountain while the multiplier
rises.

## What Is Included

- Games service: NestJS, DDD-style domain, MikroORM/PostgreSQL persistence, RabbitMQ wallet effects,
  REST commands, WebSocket round events, Swagger docs, and tests.
- Wallets service: NestJS, wallet aggregate, MikroORM/PostgreSQL persistence, RabbitMQ debit/payout
  consumer, idempotent operations, Swagger docs, and tests.
- Frontend: Vite, React, Tailwind CSS, TanStack Query, Zustand, Keycloak PKCE login, goat/mountain
  game scene, betting/cashout UI, history, leaderboard, player bets, and verification panel.
- Local infrastructure: Docker Compose with PostgreSQL, RabbitMQ, Keycloak, Kong, Games, Wallets,
  automatic migrations, and frontend.

Gameplay notes:

- Crash points stay below `14.00x` to keep local rounds playable and readable. Overflow results are
  remapped deterministically instead of being pinned to exactly `14.00x`.
- After a bet is accepted, the player must click **Pronto para comecar**. The automatic round
  runner waits for all accepted bettors to be ready before starting the climb. Empty betting rounds
  can still advance automatically.

## Prerequisites

- Docker Desktop running.
- Node.js 20+.
- npm.
- Optional: Bun, if you prefer `bun run docker:up`.

The recommended evaluator path uses npm and Docker Compose only.

## Environment Files

For the challenge delivery, no manual `.env` copy is required.

Docker Compose already loads the tracked service defaults:

- `services/games/.env.example`
- `services/wallets/.env.example`

Those files are intentionally committed so a fresh checkout can run immediately. They contain only
local challenge credentials such as PostgreSQL `admin/admin`, RabbitMQ `admin/admin`, Keycloak local
settings, and the internal local service token.

If you need local overrides, create a root `.env` file. It is ignored by Git. Useful root overrides:

```env
DEMO_DETERMINISTIC_ROUNDS=false
DEMO_ROUND_SERVER_SEED=jungle-smoke-seed-2026
DEMO_ROUND_NONCE=smoke-round
ROUND_RUNNER_TICK_MS=250
ROUND_BETTING_TICKS=12
ROUND_MULTIPLIER_STEP_BPS=750
WALLET_RESULT_TIMEOUT_MS=25000
RABBITMQ_CONNECT_ATTEMPTS=180
RABBITMQ_CONNECT_RETRY_MS=1000
```

For normal evaluation, leave the defaults as they are.

## Fast Evaluator Run

Use this when you want the shortest reliable path to run and validate the project:

```bash
npm install
npm run demo:up
npm run smoke:api
```

Then open:

- Frontend: `http://localhost:3000`
- Games Swagger: `http://localhost:4001/docs`
- Wallets Swagger: `http://localhost:4002/docs`
- Kong gateway: `http://localhost:8000`
- Keycloak: `http://localhost:8080`

Demo login:

- Username: `player`
- Password: `player123`
- Realm: `crash-game`
- Client: `crash-game-client`

## Demo Mode

Demo mode is the recommended mode for reviewers.

```bash
npm run demo:up
```

What it does:

- Starts the full Docker Compose stack.
- Enables deterministic rounds for repeatable validation.
- Runs Games and Wallets migrations safely.
- Waits for Games, Wallets, Kong, frontend, and Keycloak token readiness.
- Prints the local URLs and credentials.

In demo mode, the Games service runs with:

```env
DEMO_DETERMINISTIC_ROUNDS=true
DEMO_ROUND_SERVER_SEED=jungle-smoke-seed-2026
DEMO_ROUND_NONCE=smoke-round
```

With the default seed and nonce, the deterministic crash point verifies at `4.66x` (`46624` basis
points). This makes `npm run smoke:api` repeatable.

Optional browser smoke after `demo:up`:

```bash
npm run smoke:browser
```

This uses Playwright to validate the real Keycloak authorization-code/PKCE login and the
authenticated game shell. If Chromium is missing:

```bash
npx playwright install chromium
```

## Production-Like Local Mode

Use this mode when you want normal local gameplay with natural server-derived crash points:

```bash
npm run docker:up
```

or, if Bun is installed:

```bash
bun run docker:up
```

This keeps:

```env
DEMO_DETERMINISTIC_ROUNDS=false
```

The stack is still local Docker Compose, but it uses the same production-like service path:

- PostgreSQL persistence.
- RabbitMQ wallet debit/payout flow.
- Keycloak browser authentication.
- Kong gateway routes.
- Server-authoritative round runner.
- Automatic migrations before service startup.

Open `http://localhost:3000` and log in with `player` / `player123`.

Keyboard commands:

- `H` opens or closes the command modal.
- `B` places a bet while betting is open.
- `C` cashes out during the climb, even if focus is still in the bet or auto-cashout input.
- `A` toggles auto-cashout before a bet is active.
- `[` and `]` decrease or increase the bet by R$ 1,00.

## Stop Or Reset

Stop containers while keeping volumes:

```bash
npm run docker:down
```

Remove containers, images, and local volumes:

```bash
npm run docker:prune
```

Use the prune command only when you want a clean local reset.

## Validation Commands

Core smoke path:

```bash
npm run demo:up
npm run smoke:api
npm run smoke:browser
```

Useful local checks:

```bash
npx tsc -p services/games/tsconfig.json --noEmit
npx tsc -p services/wallets/tsconfig.json --noEmit
npx tsc -p frontend/tsconfig.json --noEmit
npm --workspace frontend run test
npm --workspace frontend run build
npm --workspace @crash/games run test
npm --workspace @crash/games run test:e2e
npm --workspace @crash/wallets run test
npm --workspace @crash/wallets run test:e2e
docker compose config --quiet
```

Containerized service tests:

```bash
docker compose run --rm games bun test tests/unit
docker compose run --rm games bun test tests/e2e
docker compose run --rm wallets bun test tests/unit
docker compose run --rm wallets bun test tests/e2e
```

## Troubleshooting

If `npm run demo:up` says Docker is unavailable, start Docker Desktop and retry.

If Keycloak takes a long time on first boot, inspect:

```bash
docker compose logs --tail 120 keycloak
docker compose ps
```

If `npm run smoke:browser` cannot reach Keycloak, restart Docker Desktop and run:

```bash
npm run demo:up
npm run smoke:browser
```

If ports are already in use, free these local ports before starting the stack:

- `3000` frontend
- `4001` Games
- `4002` Wallets
- `5432` PostgreSQL
- `5672` RabbitMQ
- `8000`, `8001`, `8443` Kong
- `8080` Keycloak
- `15672` RabbitMQ management

## Documentation Map

- `docs/overview.md`: product overview.
- `docs/architecture.md`: stack and service architecture.
- `docs/domain-model.md`: domain entities, values, and invariants.
- `docs/architecture-decisions.md`: architectural trade-offs.
- `docs/handoff.md`: current delivery status and validation notes.
- `docs/roadmap.md`: completed phases and deferred work.
- `docs/next-spec-prompt.md`: optional next Spec Kit prompt.

## Known Deferred Work

This project is ready for local challenge review, but not a hosted production deployment. Deferred
items include transactional outbox/inbox, broader Playwright regression coverage, deeper
observability, sound effects, and hosted deployment hardening.

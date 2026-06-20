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
  bets/verification, Zustand, and cropped goat run/jump/idle sprites in the mountain scene.
- `packages/contracts`: minimal shared RabbitMQ event and socket contract types.

Project-specific planning lives in `docs/` and `specs/001-gameplay-foundation/`.

Important: PostgreSQL is available through Docker Compose and MikroORM schema/migration artifacts
exist, but the active runtime providers still use in-memory repositories for gameplay state and
wallet state. Wiring durable MikroORM repositories and migration execution into startup is deferred
to the next persistence hardening spec.

Local Docker smoke has validated service health through direct ports and Kong, seeded wallet
balance, bet debit, cashout payout credit, round history, verification data, and goat sprite asset
serving. Real Keycloak login, RabbitMQ timeout/retry e2e coverage, mobile responsive review, and
PostgreSQL persistence remain follow-up gates.

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

Service-level test commands from the scaffold:

```bash
cd services/games && bun test tests/unit
cd services/wallets && bun test tests/unit
cd services/games && bun test tests/e2e
```

MikroORM migration commands, once the Docker stack/PostgreSQL are running:

```bash
cd services/games && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
cd services/wallets && bunx mikro-orm migration:up --config src/infrastructure/persistence/mikro-orm/mikro-orm.config.ts
```

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
```

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

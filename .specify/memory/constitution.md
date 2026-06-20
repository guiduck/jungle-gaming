# Jungle Crash Game Constitution

## Principles

### I. Documentation-First Direction

Product direction starts in `README.md` and `docs/`. Specs, plans, tasks, and implementation must
preserve documented decisions or update the relevant docs in the same change.

For this project, the primary sources of truth are:

- `docs/overview.md` for product shape and core workflow.
- `docs/vision.md` for outcome, evaluation posture, and product principles.
- `docs/architecture.md` for stack, service boundaries, DDD layering, and frontend state strategy.
- `docs/domain-model.md` for entities, value objects, lifecycle, and invariants.
- `docs/reference-ui.md` for the goat/mountain crash-game UI direction.
- `docs/architecture-decisions.md` for accepted trade-offs.
- `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md` for current execution state.

### II. Domain Rules Stay in the Domain

Game and Wallet business rules must live in domain code, not in controllers, DTOs, ORM models,
React components, queue handlers, or ad hoc scripts.

Domain code must not import NestJS, MikroORM, RabbitMQ, Socket.IO, controller types, DTOs, database
clients, or frontend state libraries. Application use cases coordinate domain entities through
ports; infrastructure implements those ports.

The required DDD boundaries are:

- `domain/`: entities, value objects, domain services, domain errors, and invariants.
- `application/`: use cases, repository ports, event ports, transactions, and orchestration.
- `infrastructure/`: MikroORM mappings/repositories, PostgreSQL, RabbitMQ, Keycloak, and technical
  adapters.
- `presentation/`: REST controllers, WebSocket gateways, DTOs, guards, and Swagger/OpenAPI.

### III. Server Authority, Safe Money, and Event Consistency

The server is authoritative for round state, crash point, accepted bets, cashout, settlement,
wallet balance, history, and provably fair verification.

Money must never use floating point arithmetic. Bet amounts, balances, payouts, debits, credits,
and settlement records must use integer cents or another exact decimal-safe representation.

Game and Wallet remain separate bounded contexts. Cross-service wallet effects must flow through
RabbitMQ with explicit idempotency and retry expectations. Public REST must not expose arbitrary
wallet credit/debit operations.

### IV. Spec Kit Traceability

Significant feature work must move through Spec Kit artifacts in `specs/` before implementation:

1. `speckit.specify` for user stories, requirements, non-goals, edge cases, and acceptance criteria.
2. `speckit.plan` for implementation architecture and validation strategy.
3. `speckit.tasks` for ordered implementation tasks.
4. `speckit.implement` for execution in task order.

Generated artifacts must remain aligned with `README.md`, `docs/`, this constitution, and the
official challenge API/infra constraints. If generated artifacts conflict with docs or code,
surface the conflict and resolve it explicitly before continuing.

### V. Prototype and UI State Are Requirements Tools

The first usable UI must be the game experience, not a marketing landing page. The frontend must
preserve the documented direction: a dark casino-style crash game where the multiplier drives a
goat climbing a mountain.

Prototype assets and future SVG art guide UX and visual behavior, but production code must follow
the project architecture. The frontend state model is:

- TanStack Query for persisted server state.
- Zustand for hot local game projection and animation state.
- REST for player actions.
- WebSocket for server-to-client events.

Frontend state may animate and project server data, but it must not become the source of truth for
game outcome, payout, wallet balance, or crash point.

### VI. KISS, Compatibility, and Deliverability By Default

Keep it simple. Prefer the simplest readable design that satisfies correctness, challenge
requirements, and documented product behavior. Avoid speculative abstractions, generalized
frameworks, complex sagas, premature observability, or bonus-grade infrastructure until the MVP
passes eliminatory criteria.

Prefer additive changes and established project patterns. Breaking API, schema, domain lifecycle,
Docker Compose, authentication, or workflow changes require explicit approval and documentation.

Eliminatory challenge criteria come before bonus features. `bun run docker:up` must remain the
delivery invariant: a fresh checkout should start the local stack without manual infrastructure
steps. Tests and validation must scale with risk, especially around domain invariants, money,
RabbitMQ retries, WebSocket synchronization, and provably fair verification.

Provably fair, RabbitMQ idempotency, and cashout boundary behavior must be correct, but their
implementation should stay direct and legible rather than academically elaborate.

### VII. Documentation Closeout Is Required

Every implementation must update affected docs and always update:

- `docs/handoff.md`
- `docs/roadmap.md`
- `docs/next-spec-prompt.md`

Final implementation reports must state which validation ran, what could not run, and any residual
manual smoke checks or follow-up work. Architecture decisions with meaningful trade-offs must be
captured in `docs/architecture-decisions.md`.

## Governance

This constitution governs Spec Kit work, Cursor/Codex agent behavior, and implementation closeout.

Changes to the constitution require:

- A clear reason for changing process or project guardrails.
- Updates to affected docs, templates, rules, or mirrored skills that would otherwise drift.
- An update to `docs/handoff.md` describing the change.

Cursor workflow files remain canonical where mirrored skills delegate to them. Codex agents must
load matching `.codex/skills/**` mirrors when a task triggers a project workflow skill.

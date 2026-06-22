## Command
speckit.specify

## Objective
Specify an optional post-submission hardening pass for Jungle Crash Game after the challenge has
been handed in.

## Source Request
The project has been closed for evaluator delivery. `README.md` is now a Brazilian Portuguese,
beginner-friendly runbook that documents prerequisites, tracked service `.env.example` defaults,
demo startup, production-like local startup, validation commands, troubleshooting, URLs,
credentials, and deferred work. A final playability hotfix added a bettor-ready gate before
automatic round start and kept generated crash multipliers below `14.00x` without pinning every
overflow to the ceiling.

The immediate goal is submission, not new scope. Any future Spec Kit work should only happen after
delivery or if a blocking evaluator issue is discovered. A June 22 multiplier smoothness hotfix
was already applied outside a new spec to address browser-visible `1.00x` freeze/jump behavior;
future work should treat it as a validation item, not a reason to reopen product scope. A final
June 22 `C` cashout shortcut hotfix was also applied so keyboard cashout works even when focus
remains in the betting inputs.

## Project Context
- Project: Jungle Crash Game.
- Stack: NestJS, MikroORM, PostgreSQL, RabbitMQ, Kong, Keycloak, Vite React, Tailwind CSS,
  TanStack Query, Zustand, Docker Compose, GitHub Actions, and Playwright.
- Evaluator runbook: `README.md`.
- Runbook language: Brazilian Portuguese, with simple step-by-step demo and production-like local
  instructions.
- Primary delivery commands:
  - `npm install`
  - `npm run demo:up`
  - `npm run smoke:api`
  - optional `npm run smoke:browser`
- Local login:
  - Frontend: `http://localhost:3000`
  - Username: `player`
  - Password: `player123`
  - Realm/client: `crash-game` / `crash-game-client`
- Current playability guardrails:
  - accepted bettors click **Pronto para comecar** before the automatic runner starts;
  - crash points stay below `14.00x` (`140000` basis points) without repeated ceiling pins.

## Requirements
- Do not introduce new gameplay, auth, wallet, RabbitMQ, WebSocket, persistence, or UI feature
  scope unless a blocker is discovered.
- Focus only on post-submission hardening:
  - capture fresh clean-stack validation evidence;
  - include live browser observation that the crash multiplier visibly advances during running
    rounds through the real Kong/Socket.IO path;
  - include live browser observation that pressing `C` cashes out during a running round after
    placing a bet, including when focus is still in a betting input;
  - document any machine-specific Docker Desktop or Keycloak caveats;
  - reduce evaluator friction if feedback identifies a confusing step;
  - keep README, handoff, roadmap, and operational notes in agreement.
- Preserve public API contracts, RabbitMQ contracts, WebSocket event contracts, Keycloak-first
  browser auth, integer money math, multiplier basis points, and server-authoritative crash/cashout
  behavior.

## Artifact Considerations
- `README.md` is the source of truth for evaluator setup.
- `docs/handoff.md` should record validation outcomes and caveats.
- `docs/roadmap.md` should keep deferred work explicit.
- Existing specs remain historical implementation artifacts.

## Risks / Assumptions
- Main risk: reopening product scope when the project needs to stay submitted.
- Second risk: claiming fresh validation without actually rerunning the Docker/API/browser smoke.
- Assume the current repository is deliverable for local challenge review, with deferred production
  hardening clearly documented.

## Expected Output
- A narrowly scoped post-submission hardening spec only if additional work is needed after delivery.
- Acceptance criteria centered on clean-stack proof, documentation agreement, and evaluator
  friction fixes.

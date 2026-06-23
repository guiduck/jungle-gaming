## Command
speckit.specify

## Objective
Specify a narrowly scoped VPS deployment verification pass for `jungle.gfig.space` after the
optional extras slice.

## Source Request
The project now includes the challenge extras requested after the initial delivery:

- CI validation already exists in `.github/workflows/ci.yml`.
- A new `Deploy VPS` workflow can run manually or after successful `CI` on `main`.
- Kong DB-less rate limiting is configured at the gateway.
- Frontend Auto Bet supports fixed-value and Martingale strategies with configurable stop-loss.
- The frontend has also been reorganized for maintainability: `App.tsx` only coordinates auth and
  screen selection, the public welcome/authenticated game shell are separate components, game
  panels live under `frontend/src/components/game-panels/`, game queries/mutations/socket/
  multiplier animation/dialogue/shortcuts are split into focused hooks, and `styles.css` imports
  area-specific CSS files from `frontend/src/styles/`.
- The root `README.md` now has badges, a linked table of contents, concise run instructions, a
  delivered-extras section, and short implementation snippets. Future README edits should preserve
  that compact evaluator-friendly shape.
- The frontend now installs official React/Vite Storybook, builds its static artifact during the
  frontend Docker image build, and exposes it at `/storybook`; after VPS deployment it should be
  reachable at `https://jungle.gfig.space/storybook`.

The user has a VPS at `root@216.158.236.156` and domain `jungle.gfig.space`, and wants to test the
automated deploy flow there.

## Project Context

- Project: Jungle Crash Game.
- Stack: NestJS, MikroORM, PostgreSQL, RabbitMQ, Kong, Keycloak, Vite React, TanStack Query,
  Zustand, Docker Compose, GitHub Actions, and Playwright.
- Local evaluator runbook: `README.md`.
- Main local validation commands:
  - `npm install`
  - `npm run demo:up`
  - `npm run smoke:api`
  - optional `npm run smoke:browser`
  - `npm run docker:up`
- VPS deploy workflow:
  - `.github/workflows/deploy-vps.yml`
  - default host: `216.158.236.156`
  - default user: `root`
  - default path: `/opt/jungle-gaming`
  - public URL: `https://jungle.gfig.space/`
  - required GitHub secret: `VPS_SSH_PRIVATE_KEY`

## Requirements

- Treat this as post-submission operational verification, not core gameplay scope.
- Do not change public REST contracts, RabbitMQ contracts, WebSocket events, Keycloak auth,
  integer money math, multiplier basis points, or server-authoritative gameplay.
- Verify the GitHub Actions deploy path only after the VPS repository path and SSH secret are
  confirmed.
- Record whether the deploy was triggered manually or by successful `CI` on `main`.
- Verify the deployed public URL, Kong routes, Keycloak login readiness, and at least one smoke path
  that does not leak tokens, passwords, authorization codes, PKCE verifiers, or secrets.
- Verify the deployed `/storybook` route renders the official Storybook UI without requiring
  Keycloak login.
- If the VPS environment differs from local Docker Compose, document the smallest required
  environment-specific setting instead of broadening product scope.
- Preserve the local Docker Compose challenge runbook as the primary evaluator path.
- Preserve the current frontend organization boundaries unless a concrete deploy-verification bug
  requires touching them.
- Preserve the README table of contents and concise extras/snippets section when documenting new
  validation or deployment evidence.

## Artifact Considerations

- Update `README.md` only if the deploy instructions need correction.
- Update `docs/handoff.md` with exact deploy validation outcomes, caveats, failed commands, and
  recovery steps.
- Update `docs/roadmap.md` to distinguish verified VPS deployment from future production hardening.
- Update this file again with the next useful prompt or state that no further Spec Kit work is
  needed.

## Risks / Assumptions

- The GitHub secret may not yet exist.
- The VPS may not have the repository checked out at `/opt/jungle-gaming`.
- DNS, TLS, reverse proxy, or firewall state may differ from the local Docker Compose path.
- Running a live deploy can interrupt the current VPS stack.
- Do not print or commit private SSH keys, tokens, passwords, PKCE values, or bearer tokens.

## Expected Output

- A focused spec for VPS deploy verification only if the user wants to proceed with live deploy
  validation.
- Acceptance criteria centered on deploy trigger, stack health, public URL availability, auth
  readiness, smoke evidence, and documented caveats.
- Explicit non-goals for unrelated gameplay, wallet, persistence, UI redesign, broad
  observability, and full production SRE hardening.

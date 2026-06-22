# Tasks: CI/CD and Browser Auth Smoke

**Spec**: `specs/007-ci-cd-browser-auth-smoke/spec.md`  
**Plan**: `specs/007-ci-cd-browser-auth-smoke/plan.md`  
**Status**: Ready for implementation

## Tasks

- [x] T001 Review current package scripts, frontend auth shell, and CI/smoke guardrails.
- [x] T002 Add GitHub Actions workflow for frontend, services, and Compose config validation.
- [x] T003 Add Playwright browser-smoke dependency and root `smoke:browser` package script.
- [x] T004 Implement `scripts/smoke-browser.cjs` with readiness checks, real Keycloak PKCE login,
  authenticated shell assertions, and secret-safe diagnostics.
- [x] T005 Add minimal non-visual frontend `data-smoke` hooks needed by the browser smoke.
- [x] T006 Validate CI/script syntax and run focused typecheck/test/build checks where feasible.
- [x] T007 Run or attempt local demo/API/browser smoke validation and record any environment
  blockers precisely.
- [x] T008 Update README with CI and browser smoke usage, Playwright install, and troubleshooting.
- [x] T009 Update `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md` for
  implementation closeout.
- [x] T010 Run final guardrail searches for auth bypasses, Wallet mutation shortcuts, domain
  imports, and secret leakage.
- [x] T011 Harden GitHub Actions beyond the initial fast-check baseline with script syntax checks,
  Compose image builds, deterministic full-stack startup, API smoke, browser Keycloak smoke,
  failure log/screenshot artifact upload, workflow timeouts, read-only permissions, and
  concurrency cancellation.

## Non-Tasks

- No Game/Wallet domain behavior changes.
- No RabbitMQ contract changes.
- No public auth bypasses or static bearer-token smoke shortcuts.
- No deployment to hosted infrastructure or production promotion.
- No Phase 5 release-readiness runbook work beyond preparing the next prompt.

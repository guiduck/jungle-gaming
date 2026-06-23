# Feature Specification: Post-Submission Hardening

**Feature Branch**: `008-post-submission-hardening`  
**Created**: 2026-06-23  
**Status**: Implemented  
**Input**: `docs/next-spec-prompt.md`, attached post-submission hardening prompt, and user
`/speckit-specify` request

## Summary

Define an optional hardening pass for Jungle Crash Game after the evaluator delivery has already
been submitted, or only earlier if a blocking evaluator issue is discovered.

This feature is about evidence, documentation agreement, and evaluator friction fixes. It must not
reopen gameplay, auth, Wallet, RabbitMQ, WebSocket, persistence, UI feature, or componentization
scope unless a concrete defect blocks challenge review. The current repository should remain
treated as deliverable for local challenge evaluation, with `README.md` as the Brazilian Portuguese
runbook and `npm run demo:up`, `npm run smoke:api`, and optional `npm run smoke:browser` as the
primary validation path.

The hardening pass exists to capture fresh clean-stack proof, record machine-specific Docker
Desktop or Keycloak caveats, verify the most recent browser-visible hotfixes through the real local
stack, and make small documentation corrections if evaluator feedback identifies confusing steps.

## Existing Artifact Alignment

No blocking conflict was found between the request, current docs, the constitution, or completed
specs.

- `README.md` is already the source of truth for evaluator setup, written in Brazilian Portuguese
  with beginner-friendly demo and production-like local instructions.
- `docs/handoff.md` says no new feature spec is required for submission and recommends a future
  post-submission hardening pass only after delivery.
- `docs/roadmap.md` lists release readiness as documentation-complete enough for submission and
  keeps fresh full-stack/API/browser smoke as the preferred remaining confidence check.
- `docs/next-spec-prompt.md` already contains the structured prompt for this optional
  post-submission hardening scope.
- `.specify/memory/constitution.md` requires docs-first direction, server authority, safe money,
  additive compatibility, Docker Compose local deliverability, and documentation closeout.
- Existing specs remain historical implementation artifacts and should not be reopened for this
  pass unless a concrete defect or evaluator blocker is found.

This spec preserves the completed June 22 hotfixes as validation targets, not as reasons to add
more product scope:

- accepted bettors must click **Pronto para comecar** before automatic round start;
- generated crash multipliers stay below `14.00x` without repeatedly pinning overflow outcomes to
  the ceiling;
- the displayed multiplier should visibly advance during running rounds instead of freezing at
  `1.00x` or jumping abruptly;
- pressing `C` should cash out during a running round even when focus remains in a betting input;
- anonymous visitors should see the public welcome/dialogue screen until they choose Keycloak
  login;
- authenticated callbacks should still enter the game shell after token storage;
- the final frontend panel extraction and Games payout-request readability pass should remain
  behaviorally unchanged.

## Clarifications

- Clarification pass completed on 2026-06-23. The following answers are encoded so planning and
  tasks can proceed without reopening scope.
- This spec is optional post-submission work. It must not be treated as a pre-submission blocker
  unless a concrete evaluator issue prevents the documented local review path from working.
- "Clean-stack validation" means either a fresh Docker state or a clearly documented known state.
  If a destructive reset such as removing volumes is used, it must be intentional and recorded in
  validation notes; if the existing stack is reused, that reuse must also be recorded.
- Required validation evidence is command-based and dated. A later implementation must state which
  of `npm run demo:up`, `npm run smoke:api`, and `npm run smoke:browser` actually ran, which
  passed, which failed, and which were skipped.
- `npm run smoke:browser` remains optional when local browser prerequisites are unhealthy.
  Acceptable skip reasons include Docker Desktop unavailability, Keycloak unreachability,
  Playwright/Chromium installation problems, occupied local ports, or an already-known machine
  caveat. Skips must be explicit and must include the shortest useful recovery command or note.
- Browser observation can be captured by the existing `npm run smoke:browser` command when it
  covers the relevant behavior. If the script does not yet observe multiplier movement, ready-gate
  interaction, or `C` cashout from a focused input, a manual Playwright/browser observation note is
  acceptable for this hardening pass before any automation expansion is considered.
- A "blocker" means an issue that prevents an evaluator from completing the README runbook path:
  starting the local stack, reaching the public welcome screen, logging in through Keycloak,
  placing a bet, marking ready, observing a running round, cashing out or crashing, and running the
  documented smoke commands. Cosmetic preferences, broader production-readiness ideas, and
  non-critical refactors are not blockers.
- Evaluator-friction fixes are documentation-first by default. Code changes are allowed only when
  validation proves the documented path is wrong or broken; even then, the fix must be the smallest
  coherent correction and must preserve public contracts.
- This pass should not create new data models, API contracts, RabbitMQ contracts, WebSocket
  contracts, database migrations, or UI panels during planning unless a blocker is first
  identified and explicitly scoped.

## User Stories and Acceptance Criteria

### Story 1: Maintainer Captures Fresh Clean-Stack Proof

As the submitter, I want a fresh clean-stack validation record so post-submission confidence is
based on actual Docker/API/browser evidence rather than stale assumptions.

Acceptance criteria:

- Given Docker Desktop is available, when the maintainer performs the hardening validation, then
  the stack is started from a clean or explicitly documented known state.
- Given `npm run demo:up` completes, then the validation record captures the date, environment
  caveats, command outcome, and any relevant service readiness notes.
- Given `npm run smoke:api` completes, then the validation record captures the deterministic
  gameplay/wallet/history/verification pass outcome.
- Given `npm run smoke:browser` is run, then the validation record captures whether the real
  Keycloak PKCE browser path passed, failed, or was skipped with a concrete reason.
- Given any command fails, then the failure is recorded with the affected layer and the next
  diagnostic command rather than being summarized as a generic validation failure.

### Story 2: Browser Observation Proves Recent Playability Hotfixes

As a reviewer, I want live browser observation of the latest playability fixes so I can trust the
submitted UI behaves correctly through the real local Kong/Socket.IO path.

Acceptance criteria:

- Given the demo stack is healthy and the player is authenticated through Keycloak, when a round is
  running, then the visible multiplier advances during the climb instead of remaining frozen at
  `1.00x` until a late jump.
- Given a bet is accepted, when the player marks **Pronto para comecar**, then the automatic round
  start is not blocked by unrelated empty rounds and the accepted bettor can observe the climb.
- Given focus remains in the bet amount input or auto-cashout input after placing a bet, when the
  round is running and the player presses `C`, then the cashout action is attempted through the
  normal frontend command path.
- Given the cashout succeeds, then the UI reflects the server-authoritative cashout result and
  eventual Wallet/read-model refresh rather than relying on local-only state.
- Given the generated crash point is high, then visible gameplay remains below the documented
  `14.00x` ceiling behavior and does not repeatedly produce a pinned `14.00x` outcome.

### Story 3: Browser Observation Proves Public Welcome Auth UX

As an evaluator opening the app for the first time, I want anonymous sessions to see the public
welcome screen first so the project introduction is visible before Keycloak login.

Acceptance criteria:

- Given a clean browser context with no `jungle.accessToken` and no active app session, when the
  frontend opens at `http://localhost:3000`, then the public welcome screen and Nina dialogue are
  visible before authentication.
- Given the clean anonymous session is still on the welcome screen, then the app does not
  automatically redirect to Keycloak before the user activates the login CTA.
- Given the user activates the Keycloak login CTA, then the normal Keycloak authorization-code/PKCE
  browser flow starts.
- Given Keycloak login succeeds with the local `player` user, then the authenticated game shell is
  shown after callback/token storage.
- Given a protected API/session failure occurs later, then the login-required modal remains the
  appropriate re-authentication entry point.

### Story 4: Documentation Stays Aligned and Low-Friction

As an evaluator, I want README, handoff, roadmap, and operational notes to agree so I do not have
to infer which instructions are current.

Acceptance criteria:

- Given validation completes, then `docs/handoff.md` records outcomes, caveats, and any skipped
  commands honestly.
- Given evaluator feedback identifies a confusing step, then the smallest relevant README or
  operational-note correction is made without expanding feature scope.
- Given machine-specific caveats are observed, then Docker Desktop, Keycloak, Playwright, or port
  issues are documented in the appropriate operational context.
- Given deferred work is mentioned, then `docs/roadmap.md` keeps production-hardening candidates
  explicit without implying they are required for challenge submission.
- Given this hardening pass is implemented, then `docs/next-spec-prompt.md` is updated to either
  point to the next optional post-submission item or state that no further Spec Kit work is needed.

### Story 5: Scope Remains Closed Unless a Blocker Appears

As the submitter, I want post-submission work to avoid destabilizing the delivered challenge unless
an evaluator blocker is discovered.

Acceptance criteria:

- Given no blocking evaluator issue is found, then the hardening pass does not introduce new
  gameplay, auth, wallet, RabbitMQ, WebSocket, persistence, or UI features.
- Given a defect is discovered, then the fix is scoped to the smallest change required to preserve
  the documented evaluator path.
- Given a potential improvement is not required for evaluator success, then it remains deferred
  instead of being pulled into this pass.
- Given componentization or legibility is already complete, then it is not reopened unless a
  concrete defect is traced to that work.
- Given any public contract would need to change, then the change is treated as out of scope unless
  the user explicitly approves a breaking post-submission correction.

## Functional Requirements

- **FR-001**: The hardening pass must preserve the current evaluator runbook path:
  `npm install`, `npm run demo:up`, `npm run smoke:api`, and optional `npm run smoke:browser`.
- **FR-002**: The hardening pass must capture fresh validation evidence for `npm run demo:up` and
  `npm run smoke:api` when Docker Desktop is available.
- **FR-003**: The hardening pass must attempt or explicitly justify skipping `npm run
  smoke:browser` when browser/Playwright/Keycloak conditions are not healthy.
- **FR-004**: Browser validation must include a clean anonymous session check proving the public
  welcome screen appears before Keycloak redirect.
- **FR-005**: Browser validation must include a real Keycloak login path using the documented local
  `player` / `player123` credentials.
- **FR-006**: Browser validation must include live observation that the running multiplier visibly
  advances through the real frontend/Kong/Socket.IO path or records the exact failure mode.
- **FR-007**: Browser validation must include live observation that pressing `C` during a running
  round triggers cashout even when focus remains in a betting input.
- **FR-008**: Browser validation must include observation that an accepted bettor can mark
  **Pronto para comecar** before automatic round start.
- **FR-009**: Validation notes must distinguish successful evidence, skipped evidence, local
  environment caveats, and actual product defects.
- **FR-010**: Any documentation correction must keep README, `docs/handoff.md`, `docs/roadmap.md`,
  and `docs/next-spec-prompt.md` mutually consistent.
- **FR-011**: Any evaluator-friction fix must be the smallest coherent change needed to clarify or
  unblock the documented local review path.
- **FR-012**: The pass must not add public API routes, RabbitMQ message shapes, WebSocket event
  shapes, auth bypasses, wallet mutation shortcuts, or new persistence requirements.
- **FR-013**: The pass must preserve Keycloak-first browser auth and must not reintroduce browser
  dev identity controls.
- **FR-014**: The pass must preserve integer money math and multiplier basis-point semantics.
- **FR-015**: The pass must preserve server-authoritative crash, cashout, payout, wallet balance,
  history, leaderboard, and verification behavior.
- **FR-016**: The pass must not reopen final componentization or service-legibility changes unless
  validation identifies a concrete regression.
- **FR-017**: The pass must not claim clean-stack validation unless the corresponding command was
  actually run in the current hardening pass.
- **FR-018**: If Docker Desktop, Keycloak, Playwright, Chromium, or local ports block validation,
  the caveat and recovery command must be recorded.
- **FR-019**: Any screenshots or browser diagnostics captured during hardening must avoid leaking
  bearer tokens, authorization codes, PKCE verifiers, passwords, or secrets.
- **FR-020**: Implementation closeout for this pass must update affected docs plus
  `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

## Key Validation Surfaces

- **README Runbook**: Brazilian Portuguese evaluator setup and troubleshooting instructions.
- **Demo Startup**: `npm run demo:up` against the Docker Compose local challenge stack.
- **API Smoke**: `npm run smoke:api` deterministic gameplay, wallet, history, leaderboard, and
  provably fair verification path.
- **Browser Smoke**: `npm run smoke:browser` or equivalent live Playwright/browser observation of
  public welcome, Keycloak login, authenticated shell, multiplier progression, ready gate, and `C`
  cashout shortcut.
- **Operational Notes**: `docs/handoff.md`, `docs/roadmap.md`, and `docs/next-spec-prompt.md`
  agreement about what was validated, what was deferred, and what caveats remain.

## Edge Cases

- Docker Desktop is not running, is slow after startup, or needs a restart.
- A previous Docker Compose stack leaves volumes, containers, ports, or Keycloak state in a
  confusing partial state.
- Keycloak appears healthy but token/login readiness is still warming up.
- Kong routes REST correctly but Socket.IO upgrade or fallback behavior is degraded.
- Playwright or Chromium is not installed on the reviewer machine.
- Browser local storage or Keycloak cookies hide the anonymous welcome flow unless a clean context
  is used.
- The deterministic demo round progresses before the bettor can mark ready or cash out during a
  manual observation.
- The cashout keyboard shortcut is pressed while focus is inside an input whose normal text entry
  behavior might otherwise consume the key.
- The browser smoke passes the shell login check but does not observe a full running-round cashout
  path.
- Documentation in README, handoff, roadmap, or next-spec prompt drifts after a small caveat fix.

## Non-Goals

- No new gameplay features, betting modes, round controls, auto-cashout changes, crash algorithm
  changes, or payout math changes.
- No new auth flows, auth bypasses, browser dev identity controls, static token fixtures, or
  Keycloak security weakening.
- No Wallet debit/credit/refund behavior changes, arbitrary public wallet mutation endpoints, or
  ledger redesign.
- No RabbitMQ contract changes, WebSocket event contract changes, or persistence schema changes
  unless a blocking defect requires the smallest possible correction.
- No UI redesign, new landing page, new tutorial flow, new panels, new visual effects, sound
  effects, or broad localization pass.
- No reopening of the completed frontend component extraction or Games payout-request readability
  pass for preference-only refactoring.
- No transactional outbox/inbox, deep observability stack, production deployment hardening, cloud
  hosting, analytics, or broader Playwright regression suite.
- No claim that optional production-hardening items are required for local challenge submission.

## Success Criteria

- A maintainer can point to current, honest validation evidence for demo startup, API smoke, and
  browser observations or documented skip reasons.
- A clean anonymous browser session shows the public welcome/dialogue screen before Keycloak login.
- The real browser path verifies the player can log in through Keycloak, place a bet, mark ready,
  observe multiplier progression, and use `C` cashout during a running round.
- Any machine-specific Docker Desktop, Keycloak, Playwright, Chromium, or port caveat is recorded
  clearly enough for a reviewer to recover.
- README, handoff, roadmap, and next-spec prompt remain aligned that the project is already
  submitted/deliverable and this pass is optional hardening only.
- No public API, RabbitMQ, WebSocket, auth, wallet, money, persistence, or gameplay contract is
  expanded by this pass unless an evaluator-blocking defect is explicitly identified and scoped.

## Implementation Outcome

- Implemented on 2026-06-23 as a validation-first hardening pass.
- `npm run demo:up`, `npm run smoke:api`, and `npm run smoke:browser` passed against the live local
  Docker/Kong/Keycloak stack after refreshing the frontend container.
- Live browser observation confirmed public welcome, Keycloak login, UI bet submission,
  **Pronto para comecar**, visible multiplier movement, and input-focused `C` cashout.
- Two evaluator-path blockers were fixed:
  - auth-screen welcome/login panels now layer above Nina's dialogue so the Keycloak CTA remains
    clickable;
  - `C` cashout no longer uses debounce, preventing running-round rerenders from clearing the
    shortcut before it fires.
- No public API, RabbitMQ, WebSocket, Wallet, persistence, auth, money, or gameplay contract was
  expanded.

## Assumptions

- The current repository is deliverable for local challenge review before this optional pass.
- The submitted evaluator runbook remains `README.md`.
- The default local frontend URL remains `http://localhost:3000`.
- The default local demo user remains `player` / `player123` in the `crash-game` realm with the
  `crash-game-client` browser client.
- The completed `specs/007-ci-cd-browser-auth-smoke/` implementation provides the baseline
  browser smoke command and non-visual smoke selectors.
- Future work after this spec should proceed only after delivery, or earlier only if a blocking
  evaluator issue is discovered.

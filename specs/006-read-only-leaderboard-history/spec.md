# Feature Specification: Read-Only Leaderboard and Richer History

**Feature Branch**: `006-read-only-leaderboard-history`  
**Created**: 2026-06-21  
**Status**: Planned  
**Input**: `docs/next-spec-prompt.md` and user `/speckit-specify` request

## Summary

Add an optional Phase 4 evaluator-facing read layer: a compact leaderboard and richer round/player
history view derived only from completed, authoritative gameplay records.

The feature helps evaluators inspect recent gameplay, notable wins, crash outcomes, player bet
results, auto-cashout/manual-cashout outcomes, and provably fair verification context without adding
new betting commands, wallet mutation paths, settlement behavior, admin tooling, chat, social
profiles, or broad redesign.

The Game Service remains authoritative for round state, bet outcomes, crash multipliers, cashout
triggers, payout cents, and verification metadata. The Wallet Service remains authoritative for
balances and monetary operations. Any new API surface must be additive, read-only, and backward
compatible.

## Existing Artifact Alignment

No blocking conflict was found with current docs, the constitution, or completed specs:

- `docs/vision.md` says evaluators should be able to verify that balances, round history, and
  provably fair data remain consistent.
- `docs/architecture.md` assigns round lifecycle, bets, crash points, history, and verification
  data to the Game Service while keeping Wallet mutation inside the Wallet bounded context.
- `docs/domain-model.md` already defines persisted `Round`, `Bet`, cashout trigger, payout, crash
  multiplier, and verification data that can support richer read projections.
- `docs/reference-ui.md` says the game screen already contains compact history, player bet, and
  verification panels, and that controls should stay dense and operational.
- `docs/roadmap.md` and `docs/handoff.md` identify read-only leaderboard/richer history as the next
  recommended Phase 4 bonus candidate after procedural mountain polish.
- `.specify/memory/constitution.md` requires server authority for history and safe money, additive
  compatibility, no arbitrary public Wallet credit/debit APIs, and documentation closeout.
- `specs/004-server-authoritative-auto-cashout/` added durable auto-cashout target/result fields
  that richer history can display.
- `specs/005-procedural-crash-mountain-goat-angle/` preserved gameplay contracts and left
  leaderboard/richer history for a later slice.

This spec intentionally keeps the slice read-only and evaluator-focused to avoid scope creep into
social, admin, or settlement behavior.

## Clarifications

- Clarification pass completed on 2026-06-21. The following answers are encoded so planning can
  proceed without reopening read-model, privacy, or UI-scope questions.
- The leaderboard is a read projection over completed rounds only. In-progress `betting`,
  `running`, or not-yet-settled rounds must not affect rankings.
- For this feature, a completed round means a terminal Game round with revealed verification data
  recorded in the completed-round history. Active current-round projections must stay separate.
- "Leaderboard" means a compact recent-performance table for local challenge evaluation, not a
  social product surface.
- Player display should use privacy-preserving identifiers such as the authenticated player's own
  label plus shortened player ids for other players. No broad profile, avatar, chat, or friend
  system is included.
- Ranking metrics must be deterministic and defined in the API/UI copy through labels, not hidden
  heuristics.
- The first supported leaderboard metric is **largest realized payout** from completed rounds:
  sort by `payoutCents` descending for cashed-out bets, then by `cashoutMultiplierBps` descending,
  then by completed round timestamp descending, then by bet id ascending for stable ties.
- A secondary "best multiplier" view may be included only if it reuses the same completed-bet read
  model and stays compact. It must sort cashed-out bets by `cashoutMultiplierBps` descending with
  stable deterministic tie-breakers.
- Lost bets may appear in richer round/player history, but they must not rank as payout wins.
- Ranking and history must distinguish manual cashout from auto-cashout when `cashoutTrigger` is
  available.
- Verification data should remain linked to completed rounds, not duplicated into a separate truth
  source.
- Prefer additive enrichment of the existing `GET /games/rounds/history` and `GET /games/bets/me`
  responses where it stays clear and backward compatible. Add a new `GET /games/leaderboard`
  endpoint only if planning finds that deriving the leaderboard from existing responses would be
  inefficient, unclear, or would leak too much detail to the frontend.
- If added, `GET /games/leaderboard` returns a bounded list of recent realized wins and accepts no
  mutation-oriented request body. Query parameters, if any, are limited to safe read controls such
  as `metric` and `limit`.
- The initial leaderboard limit is 10 entries by default and at most 25 entries. Rich round history
  and player bet history default to 20 entries and must cap at 50 entries.
- The leaderboard should consider the most recent completed rounds available through the Game read
  repository, capped to a simple bounded window during planning. It is not a lifetime/global
  analytics leaderboard.
- Aggregates are defined as follows: accepted bet count is the number of persisted accepted bets for
  the completed round; cashed-out count is bets with status `cashed_out`; lost count is bets with
  status `lost`; total wagered cents is the sum of accepted bet `amountCents`; total realized
  payout cents is the sum of cashed-out `payoutCents`.
- Missing legacy fields should be represented as absent or null and displayed as unavailable rather
  than inferred from frontend-local state.
- New read endpoints must not expose Wallet ledger internals, authorization tokens, unrevealed
  seeds, Keycloak profile data, or admin-only data.
- Completed-round history and leaderboard reads may remain unauthenticated if they expose only
  completed public gameplay data and privacy-preserving player display ids. Player-specific
  history remains authenticated through `GET /games/bets/me`.
- WebSocket contract changes are not required for this slice. Existing `history.updated` invalidation
  plus TanStack Query refetch should be enough unless planning discovers a concrete gap.
- UI placement should reuse the existing game screen panels. On desktop, the richer history and
  leaderboard may sit in the existing lower/side information area; on mobile, they should stack or
  use compact tabs/sections below core bet controls. This slice must not introduce a separate
  landing page or broad navigation redesign.
- No new database table is required by default. Planning may add indexes or query helpers if needed,
  but must not introduce new authoritative monetary or settlement state for the read models.
- `npm run demo:up` and `npm run smoke:api` remain valid. Smoke may be extended with read-only
  assertions, but the feature must not require browser automation.

## User Stories and Acceptance Criteria

### Story 1: Evaluator reviews recent completed rounds

As an evaluator, I want a richer recent-round history so I can quickly inspect crash outcomes,
participation, notable cashouts, and verification availability after running the local demo.

Acceptance criteria:

- Given completed rounds exist, when the evaluator opens the game screen, then recent completed
  rounds show crash multiplier, completed/settled time, total accepted bets, number of cashed-out
  bets, number of lost bets, and total realized payout cents.
- Given a round has provably fair verification metadata revealed, then the history row or detail
  view provides a clear path to inspect or open that verification data.
- Given a round contains manual and auto cashouts, then the history distinguishes the trigger type
  for notable bet results.
- Given a round is still `betting` or `running`, then it may appear in current-round UI but must not
  be counted in completed-round history rankings.
- Given there are no completed rounds yet, then the history area shows an empty state that does not
  imply missing wallet or settlement data.

### Story 2: Evaluator inspects notable cashouts

As an evaluator, I want a compact leaderboard of notable realized wins so I can see the best recent
results without reading raw database rows.

Acceptance criteria:

- Given cashed-out bets exist in completed rounds, then the leaderboard ranks entries by largest
  realized payout using the deterministic tie-breakers defined in this spec.
- Given two entries have the same payout, then sorting is stable and deterministic by cashout
  multiplier, completed round timestamp, and bet id.
- Given an entry appears in the leaderboard, then it includes player display id, payout cents,
  bet amount cents, cashout multiplier, cashout trigger, crash multiplier, and round id or short
  round reference.
- Given a player id is displayed for another player, then the UI shows a shortened display id rather
  than a broad profile or full identity surface.
- Given lost bets exist, then they do not appear as payout leaderboard wins.
- Given the evaluator changes viewport size, then the leaderboard remains dense and readable
  without covering the goat/mountain scene, wallet, bet controls, or verification panels.

### Story 3: Player reviews their own richer bet history

As an authenticated player, I want my recent bet history to explain outcomes clearly so I can
understand whether each bet cashed out manually, cashed out automatically, or lost.

Acceptance criteria:

- Given the player has recent bets, then the player history shows round id, bet amount cents,
  status, crash multiplier, optional auto-cashout target, cashout multiplier, payout cents, and
  cashout trigger when present.
- Given a bet was auto-cashed out, then the row labels it as auto rather than manual.
- Given a bet lost because the crash point was below or equal to the auto-cashout target, then the
  row shows the lost outcome without implying the target paid.
- Given the player has no bets, then the panel remains compact and shows a clear empty state.
- Given the player refreshes or reconnects, then the history reconciles from server snapshots rather
  than frontend-local event history.

### Story 4: Read-only APIs preserve server authority and privacy

As a reviewer, I want any new server read models to be additive and derived from authoritative
Game persistence so leaderboard and history views cannot mutate money or gameplay state.

Acceptance criteria:

- Given the feature requires new API support, then new routes are read-only `GET` endpoints under
  the Game Service boundary.
- Given a request is made to leaderboard/history reads, then no Wallet debit, Wallet credit, bet
  placement, cashout, settlement, or round transition command is invoked.
- Given the API returns player identifiers, then it returns only privacy-preserving ids suitable for
  the local challenge UI and does not expose Keycloak profile claims beyond what is already safe for
  the authenticated session.
- Given older clients continue using existing endpoints, then their responses and behavior remain
  backward compatible.
- Given `AUTH_MODE=keycloak`, then authenticated player-specific history still derives the player
  from the bearer token `sub`; dev identity remains limited to explicit dev mode.
- Given a public completed-history or leaderboard read is requested, then the response contains only
  completed gameplay facts and privacy-preserving display identifiers.

### Story 5: Existing challenge validation remains valid

As an evaluator, I want the existing demo and smoke workflow to keep working so this bonus does not
make the delivery harder to review.

Acceptance criteria:

- Given a fresh local challenge run, `npm run demo:up` still starts or verifies the stack and prints
  the existing evaluator URLs and credentials.
- Given `npm run smoke:api` runs after this feature, then it still validates health, auth, wallet,
  bet, cashout or crash, history/player-bet state, and provably fair verification.
- Given smoke is extended for this feature, then any new assertions are read-only and deterministic.
- Given Docker Compose services start with existing defaults, then no extra infrastructure,
  migration manual step, browser automation, or seeded social data is required to use the feature.

## Functional Requirements

- **FR-001**: The feature must provide a compact leaderboard of realized cashout wins derived from
  completed authoritative Game records.
- **FR-002**: The default leaderboard ranking metric must be largest realized payout in integer
  cents, sorted by `payoutCents` descending, `cashoutMultiplierBps` descending, completed round
  timestamp descending, and bet id ascending.
- **FR-003**: Leaderboard entries must come only from cashed-out bets in completed rounds; pending
  or in-progress round data must not affect rankings.
- **FR-004**: Richer completed-round history must expose crash multiplier, completion/settlement
  time, accepted bet count, cashed-out count, lost count, total wagered cents, total realized payout
  cents, and verification availability when data exists.
- **FR-005**: Player bet history must expose the player's recent bet amount, status, crash
  multiplier, optional auto-cashout target, cashout multiplier, payout cents, and cashout trigger
  where available.
- **FR-006**: Any new API route required for this feature must be an additive read-only `GET`
  endpoint owned by the Game Service.
- **FR-006a**: The preferred API approach is to enrich existing read responses and add at most one
  new `GET /games/leaderboard` endpoint if needed for clarity or efficiency.
- **FR-007**: Existing public route behavior must remain compatible:
  `GET /games/rounds/current`, `GET /games/rounds/history`,
  `GET /games/rounds/:roundId/verify`, `GET /games/bets/me`, `POST /games/bet`,
  `POST /games/bet/cashout`, `POST /wallets`, and `GET /wallets/me`.
- **FR-008**: The feature must not add public Wallet credit, debit, adjustment, or ledger-inspection
  endpoints.
- **FR-009**: The feature must not add or change betting, cashout, auto-cashout, round transition,
  crash generation, settlement, RabbitMQ payout/debit, or Wallet mutation commands.
- **FR-010**: Returned money values must use integer cents and returned multipliers must use
  integer basis points.
- **FR-010a**: Leaderboard and history responses must use bounded result limits: leaderboard
  default 10 and max 25; round/player history default 20 and max 50.
- **FR-011**: Ranking and aggregation must use persisted authoritative Game data, not frontend-local
  Zustand state, WebSocket-only transient events, or browser calculations.
- **FR-012**: Round verification links or summaries must continue to use the existing
  SHA-256/HMAC-SHA256 provably fair metadata and must not reveal unrevealed seeds for active rounds.
- **FR-013**: The frontend must integrate the leaderboard/history into the existing game screen as
  dense operational panels, not as a marketing page or broad redesign.
- **FR-014**: The UI must remain responsive on desktop and mobile widths without incoherent overlap
  with the goat/mountain scene, wallet status, bet controls, current bets, or verification panel.
- **FR-015**: The UI must clearly label ranking metric, cashout trigger, and completed-round status
  so evaluators do not confuse in-progress projections with settled results.
- **FR-015a**: The frontend must reuse the existing game-screen information area for leaderboard
  and richer history, using compact responsive panels/tabs rather than adding a new route or landing
  page.
- **FR-016**: The feature must preserve Keycloak-first auth behavior and explicit dev-auth fallback
  boundaries.
- **FR-017**: `bun run docker:up`, `npm run demo:up`, and `npm run smoke:api` must remain valid
  after implementation.
- **FR-018**: Implementation closeout must update affected docs plus `docs/handoff.md`,
  `docs/roadmap.md`, and `docs/next-spec-prompt.md`.

## Key Entities and Read Models

- **Round**: Existing completed round data remains the source for crash multiplier, status,
  completion/settlement timestamps, verification metadata, and aggregate bet summaries.
- **Bet**: Existing bet data remains the source for amount, player id, status, auto-cashout target,
  cashout multiplier, payout cents, and cashout trigger.
- **LeaderboardEntry**: A read model derived from completed cashed-out bets. It contains no mutable
  gameplay behavior and no Wallet operation commands.
- **RoundHistorySummary**: A read model derived from completed rounds and their accepted bets,
  including aggregate counts and cents totals.
- **PlayerBetHistoryEntry**: A player-scoped read model derived from the authenticated player's
  accepted bets and completed round outcomes.
- **Verification Metadata**: Existing provably fair reveal/commitment data remains accessible
  through the established verification behavior.

## Edge Cases

- No completed rounds exist.
- Completed rounds exist but no cashed-out bets exist.
- Two or more leaderboard entries have identical payout and multiplier values.
- A round contains only lost bets.
- A round was reconciled after restart and has preserved accepted bet participation.
- A bet has no auto-cashout target because it predates the auto-cashout feature or was manual-only.
- A cashed-out bet has `cashoutTrigger` missing because it predates trigger tracking.
- A completed round has verification metadata unavailable due to legacy or partial local data.
- A player views history after reconnect while WebSocket events were missed.
- The Game Service has a larger history table than the UI should display at once.
- Mobile viewport has limited vertical space after the mountain scene and bet controls.

## Non-Goals

- No new betting command, auto-bet, recurring bet, or betting automation.
- No new cashout command or change to manual/auto-cashout semantics.
- No Wallet debit, credit, adjustment, refund, seed-credit, or settlement behavior changes.
- No public arbitrary Wallet mutation or Wallet ledger browsing APIs.
- No change to crash-point generation, `houseEdgeBps = 100`, SHA-256 seed commitment, HMAC-SHA256
  derivation, or verification semantics.
- No chat, friends, avatars, social profiles, global accounts directory, or player search.
- No admin dashboard, fraud tooling, back-office reporting, or operator controls.
- No cloud deployment, analytics warehouse, Prometheus/Grafana, or heavy observability stack.
- No full app redesign, new landing page, or replacement of the goat/mountain game identity.
- No requirement for browser-automated Keycloak PKCE smoke in this slice.
- No generalized CQRS/event-sourcing framework unless a later plan proves a simple read query is
  insufficient.

## Success Criteria

- Evaluators can inspect recent completed rounds and understand crash outcomes, participation,
  notable wins, and verification availability from the game screen.
- The leaderboard ranks realized cashout wins deterministically from persisted completed-round data.
- Player bet history explains manual cashout, auto-cashout, and lost outcomes without relying on
  frontend-local truth.
- No public command or API can mutate betting, cashout, wallet, settlement, or round lifecycle as
  part of this feature.
- Existing normal play and deterministic evaluator commands remain usable.
- Backend typecheck/tests and frontend typecheck/build/tests remain expected validation gates for
  implementation planning.
- Documentation closeout captures any new read endpoints, UI behavior, validation, and the next
  Spec Kit prompt.

## Assumptions

- The completed `005-procedural-crash-mountain-goat-angle` implementation is the baseline.
- Existing Game persistence contains enough completed round, bet, cashout trigger, payout, crash
  multiplier, and verification data to build the first read models without adding new money or
  settlement state.
- Additive read endpoints may be introduced if existing endpoints would make the UI inefficient or
  unclear.
- The local challenge context does not require cross-instance global ranking, long-term analytics,
  or privacy controls beyond concise player-id display.

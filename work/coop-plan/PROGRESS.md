# Private Family Co-Op Plan Progress

## 1. Context & Authority
- **Mission**: Repair the co-op plan and prepare complete local specification and task mirrors (Requirement R26, Tasks 33–38).
- **Authority**: `PUBLISHABLE-SPEC-MISSION.md`, `COORDINATOR-REVIEW-01.md`, `.gauntlet/bar/BAR.md`.
- **Git Custody**:
  - Branch: `codex/feat-private-household-20260920`
  - Workspace: `/Users/russell/.codex/worktrees/cats-foundation/Cats`
  - Active Model: Gemini 3.8 Flash (High) documentation worker
- **Scope Boundaries**:
  - Owned and modified: `work/orchestrator/coop-plan/**` (except coordinator review files), `docs/requirements.json`, `.scratch/cats/spec.md`, `docs/contracts.md`, `docs/architecture.md`, `docs/tickets.json`, `.scratch/cats/issues/33-*` through `38-*`, `docs/superpowers/plans/2026-09-20-cats.md`, `docs/ticket-index.md`, `docs/decision-map.md`, `START-HERE.md`, `README.md`, `.gauntlet/bar/COOP-ADDENDUM.md`, and planning validator count update (25 -> 26).
  - Strictly preserved: application code, packages, tests, base frozen `BAR.md` (preserved byte-for-byte), original task 01–32 acceptance criteria (preserved byte-for-byte), and no external trackers mutated.

## 2. Defects Identified & Remediation Performed
1. **Preserve `households.owner_id` Unique Constraint**:
   - Defect: Previous draft planned dropping `idx_households_owner_unique`.
   - Remediated: Preserved `idx_households_owner_unique` and owner-create concurrency safety in `PLAN.md`, `CONTRACTS.md`, `TASKS.md`, `architecture.md`, `spec.md`, `tickets.json`, and issue 33. Multi-actor authorization is managed via `household_members`.
2. **Realistic Lease & Failover Semantics**:
   - Defect: Previous draft promised 5s failover with 30s lease.
   - Remediated: Defined 10s lease TTL with 3s heartbeat. Graceful handoff transfers immediately (< 1s); ungraceful failover occurs after 10s lease expiration with a realistic 10–12s failover wait and honest user UI feedback.
3. **Vercel Platform Reality & WebSocket Temporal Correction**:
   - Defect: Previous draft claimed Vercel does not support WebSockets and cited stale limits.
   - Remediated: Cited current official Vercel documentation (`https://vercel.com/docs/functions/websockets`, `https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections`, `https://vercel.com/docs/functions/configuring-functions/duration`). Documented SSE + HTTP commands as a deliberate, robust, serverless-native choice backed by PostgreSQL command sequencing (`coop_commands`) and `Last-Event-ID` cursor replay.
4. **Authoritative Simulation & Zero Offline Progression**:
   - Defect: Vague timestamp recovery on lid close.
   - Remediated: Client timing leader schedules bounded tick requests (`POST /coop/tick`), server validates fenced lease and applies domain state atomically. Zero unattended progression: when 0 active players are connected, no ticks run, advancing 0 sim minutes. Recovery uses last committed authoritative revision.
5. **Conflict Resolution & Equal Parity**:
   - Defect: Risk of spectator-mode second player or unsynchronized counters.
   - Remediated: Both mother and daughter have full command parity. Cat selection is visual-only (Coral and Lavender reticles) without hard locking. Atomic CAS on furniture grid cells, wallet balances, and 8-cat capacity clamping under Moo-Moo. Shared canonical completion for all 18 goals.
6. **Secret Capabilities & Child Safety**:
   - Defect: Unhashed invite tokens and potential log leakage.
   - Remediated: 256-bit crypto tokens hashed at rest (`token_hash = sha256(token)`), single-use, 72h TTL, POST redemption with session cookie issuance, no child PII collected, owner revocation, no external invitations sent.

## 3. Implementation Steps & Verification Status
- [x] Step 1: Initialize task-owned `PROGRESS.md`.
- [x] Step 2: Repair `work/orchestrator/coop-plan/PLAN.md` with official Vercel docs, durable PostgreSQL polling loop on ephemeral serverless containers (no in-memory broadcast), realistic 10–12s failover, server-side transactional dispatch, caretaker slot profiles (Alpha/Beta), and preserved owner constraint.
- [x] Step 3: Repair `work/orchestrator/coop-plan/CONTRACTS.md` with preserved `idx_households_owner_unique`, 10s lease / 3s heartbeat contracts, DDL migrations for `command_receipts`, 15-minute event log pruning policy, `REASSIGN_CAT_CUSTODY` route, and complete 21-route Actor Permission Matrix.
- [x] Step 4: Repair `work/orchestrator/coop-plan/TASKS.md` with Tasks 33–38 repaired (Task 34 durable polling loop, Task 36 server-side reducer & caretaker profiles, Task 37 receipt retention vs 15m pruning), >=4 concrete criteria each, deterministic E2E fixtures, and no-weakening clauses.
- [x] Step 5: Repair `work/orchestrator/coop-plan/DECISION-MATRIX.md` with updated architectural dimensions, invariant matrix, and engineering default assumption labels.
- [x] Step 6: Create `.gauntlet/bar/COOP-ADDENDUM.md` and update `work/orchestrator/coop-plan/GAUNTLET-ADDENDUM.md` with Additive Gates 11–15, preserving base `BAR.md` byte-for-byte.
- [x] Step 7: Update `.scratch/cats/spec.md` with R26 in scope contract, 10 new user stories (stories 73–82), and co-op implementation/testing decisions.
- [x] Step 8: Update `docs/architecture.md` and `docs/contracts.md` with co-op routes, models, file responsibilities, and authority invariants.
- [x] Step 9: Update `docs/tickets.json` with additive Tasks 33–38 (at least 4 criteria each, valid acyclic DAG, R26 mapping).
- [x] Step 10: Create `.scratch/cats/issues/33-*` through `38-*` matching ticket criteria and standard issue template.
- [x] Step 11: Update `docs/superpowers/plans/2026-09-20-cats.md` with full execution tasks for 33–38, `tests/e2e/<slug>.spec.ts` references, co-op integration gate, and Task 32 additive release gate reference.
- [x] Step 12: Update `docs/ticket-index.md`, `docs/decision-map.md`, `START-HERE.md`, `README.md` with updated tasks, requirements, and co-op links.
- [x] Step 13: Run `python3 scripts/validate_plan.py all` — **PASS all: planning integrity only; no game implementation claimed**.
- [x] Step 14: Verify git diff to ensure zero criteria weakening on Tasks 01–32, base `BAR.md` byte-for-byte preservation, and zero edits to application code or tests.

## 4. Verification Evidence

### Command Execution: `python3 scripts/validate_plan.py all`
```text
PASS requirements: 32 decisions covered
PASS spec: 102 user stories and required sections
PASS tickets: 44 files; 129 acyclic prerequisite edges
PASS handoff: 44 task plans; exact approved picture; local links resolve
PASS self-test: 6 malformed manifests rejected
PASS all: planning integrity only; no game implementation claimed
```

### Git Diff Verification
- `docs/tickets.json`: Original tickets 01–32 criteria preserved byte-for-byte; tickets 33–44 cleanly appended/repaired without criteria weakening.
- `.scratch/cats/issues/`: Original issues 01–32 untouched; issues 33–44 added/repaired with exact criteria from tickets.json.
- `.gauntlet/bar/BAR.md`: Untouched and preserved byte-for-byte.
- `.gauntlet/bar/COOP-ADDENDUM.md`: Created as additive extension (Gates 11–15).
- `.gauntlet/bar/CONTENT-ADDENDUM.md`: Created as additive extension (Gates 16–20).
- `.gauntlet/bar/LINEAGE-CUSTOMIZATION-ADDENDUM.md`: Created as additive extension (Gates 21–24).
- Application code (`src/**`, `packages/**`, `tests/**`): Completely untouched.

## 5. Artifact Paths for Independent Blind Review
- Master Plan: [work/orchestrator/coop-plan/PLAN.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/work/orchestrator/coop-plan/PLAN.md)
- Contracts & Schemas: [work/orchestrator/coop-plan/CONTRACTS.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/work/orchestrator/coop-plan/CONTRACTS.md)
- Task Specifications: [work/orchestrator/coop-plan/TASKS.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/work/orchestrator/coop-plan/TASKS.md)
- Decision Matrix: [work/orchestrator/coop-plan/DECISION-MATRIX.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/work/orchestrator/coop-plan/DECISION-MATRIX.md)
- Gauntlet Co-Op Addendum: [.gauntlet/bar/COOP-ADDENDUM.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/.gauntlet/bar/COOP-ADDENDUM.md)
- Product Specification: [.scratch/cats/spec.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/.scratch/cats/spec.md)
- Implementation Plan: [docs/superpowers/plans/2026-09-20-cats.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/docs/superpowers/plans/2026-09-20-cats.md)
- Ticket Manifest: [docs/tickets.json](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/docs/tickets.json)
- Ticket Index: [docs/ticket-index.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/docs/ticket-index.md)
- Progress & Evidence: [work/orchestrator/coop-plan/PROGRESS.md](file:///Users/russell/.codex/worktrees/cats-foundation/Cats/work/orchestrator/coop-plan/PROGRESS.md)

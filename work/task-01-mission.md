# AGY implementation mission — Task 01 / GitHub #2 / CATS-2

You are the implementation worker using Gemini 3.8 Flash High. The user asked AGY to finish the full Cats game while Codex orchestrates and quality checks via a gauntlet. Your bounded assignment is Task 01: create and resume a private saved household. Complete it before taking any other product task.

Workspace: /Users/russell/.codex/worktrees/cats-foundation/Cats
Branch: codex/feat-private-household-20260920
Base: 93b564fc4f07a1a768871a252f394db5d5ea2ec4
Dev port: 43171; use only your port and record every PID you start.

Read first: AGENTS.md, START-HERE.md, .scratch/cats/issues/01-private-household.md, Task 01 only in docs/superpowers/plans/2026-09-20-cats.md, docs/contracts.md, docs/architecture.md, CONTEXT.md, .scratch/cats/spec.md, .gauntlet/bar/BAR.md. OPEN docs/art/approved-direction.png. Confirm live issue #2 and comments with gh-axi.

You are not alone in the codebase. Do not revert peers' edits. Own app scaffolding, package/config/lockfile, src, tests, Task01 service integration, and work/issue-2. Orchestrator owns .gauntlet/bar, .gauntlet/PROGRESS.md and work/orchestrator. Acceptance auditor writes only work/acceptance. Do not alter confirmed requirements, task acceptance criteria, or planner tests to make implementation pass.

Ruling: contracts.md contains an old openScenario Promise<void> declaration below its exact persisted-view contract; implement the specified return {householdId:string}, not void. Record source mapping, do not hide this inconsistency in behavior. Next.js/Pixi/Neon/Clerk are proposed technical choices: retain unless concrete access or technical evidence warrants an equivalent documented alternative with no scope loss.

First concrete step: verify supported package versions from primary docs, and provision real isolated development authentication/database under Cats before SDK wiring. Use existing authorized account/CLI/API paths safely. Never expose secrets. Free resources are authorized; report exact newly billable action before purchase. Never touch sibling product resources. If you lack one prerequisite, diagnose and write exact need, continue independent harness/domain/UI work; no mock/no-op fallback may be presented as accepted product.

Write work/issue-2/PROGRESS.md and GATES.md before product changes and update after each material increment. Implement tests-first meaningful behavior: private allowlist, signed-in/expired/uninvited/cross-owner boundaries, one household on repeated create, stable identity/name across reload/sign-out, real DB roundtrip, usable desktop/phone entry/loading/retry/sign-out. Establish all named focused test commands in the contract.

No broad tests on this working Mac; focused tests only and CI for broad validation. Never launch intrusive headed test windows. Browser work via existing shared HTTP MCP only, never per-agent stdio/daemon/Chrome bridge. No fake fixture controls in production. Build determinism hooks for independent captures: fixed seed/step, paused fixture, settled fonts/animations, new isolated contexts. You may inspect your own output, but only orchestrator evidence and fresh independent critics accept work.

Do not spawn other agents. Do not merge or close issues. Commit small coherent increments, push feature branch, open a draft PR with all relevant existing labels and screenshots you actually opened. Use Part of #2, not Closes. Orchestrator handles review, final captures, acceptance and merge. If a screenshot or access gate remains, continue safe independent work and report exact dependency; do not claim DONE.

Deliver report work/issue-2/REPORT.md: implemented paths, exact commits, RED/GREEN focused evidence, actual service identities (no secrets), commands run, screenshot paths with what you viewed, remaining criteria and next executable action. Final response compact: status, commits, PR URL, tests, concrete needs. Never stop just to ask a routine question; make reversible engineering decisions within contract.

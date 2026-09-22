# Cats agent instructions

## Mission

Build the full Cats game from START-HERE.md and the specification. This is a cute but consequential browser life simulation for a private recipient. The public repo does not make game data public. No particular model, provider or agent framework is required.

## Read before work

Read CONTEXT.md, .scratch/cats/spec.md, docs/architecture.md, docs/contracts.md, relevant ADRs, docs/ticket-index.md and PROGRESS.md. Open docs/art/approved-direction.png. Requirements R01–R25 and user corrections govern the whole implementation. Read the exact issue and its prerequisite evidence, not just its status.

## Delivery

- Work in complete vertical slices: real UI, simulation, persistence, access, failure states and tests. Never replace gameplay with the concept picture.
- Preserve all capabilities and acceptance criteria. Proposed defaults may be tuned with measured evidence; confirmed requirements require the owner's correction to change.
- Write task-owned gates before coding and maintain progress with source, branch/commit, owner, evidence, remaining gates and next action.
- Run focused behavioral checks first. Dogfood every issue against its purpose, art direction, overall game mission, UX and regressions.
- Every issue/spec/PR needs independent blind review. Do not close issues or call work done from a commit, draft PR or partial test subset.
- Every PR requires screenshots: affected desktop/phone before/after; non-UI changes require passing-verification capture. OPEN every screenshot and describe the surface/state. Fix clipping, overlapping, missing stacking and overflow before acceptance.
- Keep auth private, owner checks server-side, secrets out of source, and test fixtures out of production. Never use the recipient's save as test data.
- Do not auto-run broad tests or launch intrusive windows on the owner's working computer; use focused checks and CI/dedicated environments.
- Do not delete others' changes, use shared git stash, or kill processes by pattern. Keep branch/worktree ownership explicit. Branch from current main, use small coherent commits and draft PRs, and clean up a task-owned branch/worktree after accepted merge.
- Stop only the action requiring an unavailable prerequisite; finish all independent work and record precisely what that action needs. Do not call unverified production behavior complete.

## Agent skills

Use an available skill router to load only the current task's relevant skill. The repository's handoff is complete even when a local model has no skill system. Tracker: docs/agents/issue-tracker.md. Labels: docs/agents/triage-labels.md. Domain docs: docs/agents/domain.md.

## Planning checks

Run python3 scripts/validate_plan.py all when editing requirements, spec, tickets or plan. This checks planning integrity only and is not evidence of a working game.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

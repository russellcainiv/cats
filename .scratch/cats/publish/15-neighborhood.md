# 15 — Travel to a lively persistent neighborhood

**What to build:** Leave home, visit the park and see other cats while the household continues off-camera.

**Blocked by:** 06 — Watch personalities and free will shape behavior; 09 — Undo and demolish without trapping cats

**Status:** ready-for-agent

**Requirements:** R03, R24

## Acceptance criteria

- [ ] Connect home, park, residential homes, shop and café using actual navigable routes.
- [ ] Travel takes simulation time and can fail/cancel with recovery; return preserves state.
- [ ] Off-camera household activity uses one shared clock, not duplicate independent simulation loops.
- [ ] NPC identities, routines, traits and locations persist instead of respawning each visit.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.


## Source contract

[Full specification](https://github.com/russellcainiv/cats/blob/main/.scratch/cats/spec.md) · [Model implementation plan](https://github.com/russellcainiv/cats/blob/main/docs/superpowers/plans/2026-09-20-cats.md) · [Approved art](https://github.com/russellcainiv/cats/blob/main/docs/art/approved-direction.png)

Native issue dependencies define the runnable frontier. The local task numbers in the body are plan identifiers, not GitHub issue numbers.

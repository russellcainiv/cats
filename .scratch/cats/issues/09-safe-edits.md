# 09 — Undo and demolish without trapping cats

**What to build:** Pause to build, undo/redo within a build session, and safely resume household activity.

**Blocked by:** 08 — Build the floor plan, rooms and finishes

**Status:** ready-for-agent

**Requirements:** R06

## Acceptance criteria

- [ ] Reject walls on cats, stranded entrances and inaccessible required/occupied anchors with a visible highlight.
- [ ] Cancel restores the whole transaction; undo/redo includes geometry and cost.
- [ ] Invalidate routes after edits; resuming replans against the current topology.
- [ ] Undo cannot cross a live simulation/save epoch, restore a dead cat or duplicate money/items.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.

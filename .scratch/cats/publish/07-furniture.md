# 07 — Buy, place, recolor, move, rotate and sell furniture

**What to build:** Decorate the real home with functional objects paid for using household money.

**Blocked by:** 05 — Feed, rest, play and care for cats

**Status:** ready-for-agent

**Requirements:** R02, R04, R06, R12

## Acceptance criteria

- [ ] Touch and mouse support preview, rotate, confirm, cancel, move, sell and authored color/style variants.
- [ ] Validate footprints, wall/door overlap, anchors and walkability before an atomic debit and placement.
- [ ] Insufficient funds, occupied objects and rejected edits give reasons; retries never double-charge.
- [ ] Changed layouts persist and cats actually use moved furniture.
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

# 26 — Make the private gift welcoming and understandable

**What to build:** Guide her through play, let her personalize cats and dedication, and control sound.

**Blocked by:** 04 — Create real or imaginary cats; 05 — Feed, rest, play and care for cats; 14 — Complete goals and unlock content; 19 — Moo-Moo, chance pregnancy and safe birth; 25 — Adopt and move adult cats to neighborhood homes

**Status:** ready-for-agent

**Requirements:** R07, R11, R16

## Acceptance criteria

- [ ] Provide a skippable/resumable tutorial for select, care, build, relationships and saves.
- [ ] Do not invent her name or real-cat identities; editable profiles are usable without missing personal details.
- [ ] Sound starts after interaction with music/effects controls, mute and reduced-motion support.
- [ ] Isolate tester saves; reset requires specific confirmation and a recovery snapshot.
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

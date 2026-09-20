# 30 — Balance a complete household lifetime

**What to build:** Play a complete saga of care, building, work, love, kittens, danger, death and legacy.

**Blocked by:** 14 — Complete goals and unlock content; 19 — Moo-Moo, chance pregnancy and safe birth; 20 — Raise kittens and follow generations; 21 — Age at a fixed pace and face old age; 22 — Treat illness and respond to danger; 23 — Memorialize cats and receive ghost visits; 24 — Own and operate a cat café; 25 — Adopt and move adult cats to neighborhood homes; 27 — Complete coherent game art and content; 29 — Survive migrations, corruption and interrupted saves

**Status:** ready-for-agent

**Requirements:** R01, R02, R08, R12, R19, R20, R22, R23

## Acceptance criteria

- [ ] Run deterministic long-duration scenarios and record money, needs, population, pregnancies and mortality.
- [ ] Early sessions and unlocks are attainable; care/treatment budgets are sustainable without infinite-profit exploits.
- [ ] Exercise simultaneous conception/adoption/death/reload against the eight-slot invariant across seeded runs.
- [ ] Tune engineering defaults using measurements while retaining all confirmed scope and fixed lifespan intent.
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

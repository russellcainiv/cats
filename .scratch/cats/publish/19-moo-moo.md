# 19 — Moo-Moo, chance pregnancy and safe birth

**What to build:** Willing cats in love can Moo-Moo and sometimes conceive and later welcome kittens.

**Blocked by:** 18 — Fall in love with mutual readiness; 04 — Create real or imaginary cats

**Status:** ready-for-agent

**Requirements:** R16, R17, R18, R19, R20, R21

## Acceptance criteria

- [ ] Use exactly Moo-Moo; keep its presentation discreet and non-graphic.
- [ ] Player or cats may initiate, but both must be willing/in love/in mood at start and completion.
- [ ] Roll conception once per completed eligible action with persisted seeded RNG; declined/canceled attempts never roll.
- [ ] At eight occupied/reserved spaces Moo-Moo still works without pregnancy; at seven a new litter reserves at most one slot.
- [ ] Reserve litter size at conception; creation, adoption and simultaneous conception share capacity checks; birth atomically exchanges slots for kittens.
- [ ] Persist pregnancy, parents, due time, RNG and birth idempotency; retries, reload and interruptions cannot duplicate kittens.
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

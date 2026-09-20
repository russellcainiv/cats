# 29 — Survive migrations, corruption and interrupted saves

**What to build:** Upgrade and recover existing households without silent resets or lost generations.

**Blocked by:** 03 — Resume safely across devices and pause while away; 19 — Moo-Moo, chance pregnancy and safe birth; 21 — Age at a fixed pace and face old age; 24 — Own and operate a cat café

**Status:** ready-for-agent

**Requirements:** R09, R10

## Acceptance criteria

- [ ] Version/validate complete state, catalog references, RNG, action queues, family, deaths and businesses.
- [ ] Migrations are deterministic and transactional with immutable pre-migration backup; future versions are rejected.
- [ ] Checksum, revision and epoch conflicts show named recovery copies without overwriting the winning cloud save.
- [ ] Export/import is recovery only; it safely remaps imported ownership and IDs and preserves invariants.
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

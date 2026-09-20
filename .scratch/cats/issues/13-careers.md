# 13 — Work scheduled careers and earn promotions

**What to build:** Choose among three careers, attend shifts, earn wages and advance through three ranks.

**Blocked by:** 05 — Feed, rest, play and care for cats; 11 — Paint, improve and sell artwork

**Status:** ready-for-agent

**Requirements:** R03, R12, R14

## Acceptance criteria

- [ ] Each track defines schedules, skill criteria, wages and explicit promotion requirements.
- [ ] Departure, attendance, return and payment are real saved activities, with wages issued once.
- [ ] Handle lateness, low needs, job changes, dismissal, interruption and death without phantom pay.
- [ ] Career UI explains progress on phone and desktop; off-camera work shares the paused world clock.
- [ ] Cats automatically wear a distinct outfit matching their career at departure and during work; return, cancellation and job change restore the ordinary look without changing coat/accessories, and mid-shift saves preserve the correct outfit.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.

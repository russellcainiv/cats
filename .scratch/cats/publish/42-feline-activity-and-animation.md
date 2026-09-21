# 42 — Feline-adapted human-like career and hobby activities with authentic instinct animations

**What to build:** Deliver complete vertical slice for feline-adapted career/hobby activities and natural cat instinct animations, featuring paw-based interactions, four-legged tailored workwear, and state-driven behavior polish.

**Blocked by:** 06 — Watch personalities and free will shape behavior; 11 — Paint and sell art; 12 — Tend the garden and harvest crops; 13 — Pursue careers and earn promotions; 27 — Incorporate original art assets and expand catalog content; 40 — Complete reusable GPT Image artwork integration across rooms, lots, cats, outfits, and UI

**Status:** ready-for-agent

**Requirements:** R02, R03, R06, R11, R12, R13, R14, R15, R18, R30

## Acceptance criteria

- [ ] Implement feline-adapted action animations for careers and hobbies: cats knead dough with front paws at the café, dig garden beds with front claws, dab paint onto canvases with paw tips or mouth-held brushes, and carry harvest baskets in jaws, strictly avoiding human torsos or hands.
- [ ] Render four-legged tailored career uniforms (Café Assistant apron, Garden Keeper overalls, Gallery Helper smock/beret) that fit natural cat anatomy without warping and automatically equip on work departure and restore on return.
- [ ] Implement authentic feline instinct behaviors and idle animations: loafing, curling up in cardboard boxes, mutual head-bunting, self-grooming, tail flicks indicating mood, spontaneous zoomies, and autonomous distraction by yarn or laser toys.
- [ ] Integrate state-driven animation controller with audio effects and visual particle feedback, synchronizing action states across co-op sessions and maintaining 60fps on both desktop and mobile touch devices.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.

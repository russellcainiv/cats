# 43 — Durable multi-generation lineage tree, relatedness guards, and hybrid naming

**What to build:** Deliver complete vertical slice for durable multi-generation lineage tracking, ancestor relatedness validation, deterministic order-independent hybrid breed naming at birth, and interactive family tree UI across desktop and mobile.

**Blocked by:** 20 — Raise kittens and watch family traits emerge; 39 — Percentage-based kitten inheritance of looks and traits with per-player capacity reservation

**Status:** ready-for-agent

**Requirements:** R20, R27, R31

## Acceptance criteria

- [ ] Implement multi-generation lineage data structure in WorldState.lineage: each cat records immutable lineageId, parentAId, parentBId, and snapshot (nameAtConception, breed, appearanceSnapshot, isGhost); deceased/memorial cats retain ancestry nodes without erasure, and cycles are strictly rejected via DAG validation.
- [ ] Implement genealogical relatedness checker (areCatsRelated(catA, catB, maxGenerations = 3)) that traverses ancestor graph to prevent inbreeding and Moo-Moo romance between parent-child, full/half siblings, and grandparent-grandchild, providing gentle explanatory in-game feedback.
- [ ] Implement deterministic order-independent hybrid breed naming engine: when parents of distinct breeds successfully give birth, compute recipe key sort([breedA, breedB]).join('x') to assign cute coined hybrid names (e.g. Bengal x Ragdoll -> Ragdal); preserve exact foundation breeds and generation depth (F1, F2), preventing unbounded hyphenation/concatenation; names generate only at birth, not on unsuccessful romance.
- [ ] Build interactive Family Tree UI component for desktop (1280x800) and mobile (390x844): hierarchical pan/zoom node tree displaying portraits, names, birth breeds, hybrid badges, and ghost indicators, with tap-to-inspect card showing relatives, synchronized across co-op devices.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.

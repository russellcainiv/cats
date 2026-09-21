# Cats

Cute but consequential browser life simulation — a private gift for Russell’s girlfriend (cats + The Sims). Public GitHub holds the planning package; gameplay access stays invited/private.

Direct a household of up to eight cats with personalities and free will: build and decorate, careers/hobbies/businesses, neighborhood life, earned unlocks, fixed aging, death + memorials + occasional ghosts. **Moo-Moo** needs mutual love and willingness and only has a chance of kittens. Same save follows phone ↔ computer; time pauses while away (no offline deaths).

**Art:** approved Candy Cartoon + Pocket Pixel Town blend (`docs/art/approved-direction.png`) — reference only, not a static game.

**Status:** specification + ticketed plan complete; game not implemented yet. Build dependency-ordered vertical slices from `START-HERE.md` / `.scratch/cats/spec.md` — real UI, simulation, persistence, tests. Never ship the concept picture as gameplay.

**Proposed stack:** Next.js · PixiJS 8 · headless sim · Clerk · Neon · IndexedDB. Server owns auth, leases, revisions; rendering never mutates domain state.

**Done means:** full ticket graph + blind review + private deploy proof + actual recipient acceptance — not an agent test account.

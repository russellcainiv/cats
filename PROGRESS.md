# Cats planning and setup progress

## Scope

Source: completed design interview and approved A + B GPT Image concept. Deliver a complete, model-neutral spec and execution plan, public repository, published tickets and native Linear sync. Game implementation is the next executor's work.

## Custody and delivery

Public repository: https://github.com/russellcainiv/cats. Planning branch: codex/cats-planning-setup, based on the initial main commit 2a5a9088252699d161abe0283cac863956608e62. First published plan commit: ab8dff3. The setup PR carries final verification and is merged after its checks pass.

## Verified evidence

- 32 confirmed decisions preserved (R01–R32); 102 user stories; 44 implementation tasks with 129 acyclic prerequisite edges.
- Additive Co-Op Gauntlet Gates (11–15), Expanded Content Gauntlet Gates (16–20), and Lineage & Customization Gauntlet Gates (21–24) established.
- Round 1 critic review defects repaired:
  - Ephemeral container SSE transport using durable PostgreSQL polling loop, Vercel function duration up to 300s with Fluid Compute and native WebSocket support.
  - Server-side transactional command dispatch with `SELECT ... FOR UPDATE`, snapshot commit before SSE emission, caretaker slot profiles (Alpha/Beta, 4 cats max each), and `REASSIGN_CAT_CUSTODY`.
  - Complete 21-route Actor Permission Matrix covering single-player, co-op, recovery, and test hooks.
  - Account revocation preserves cat custody under active owner with zero cat deletions or silent moves.
  - Separate 15-minute event log compaction from durable command receipt retention with monotonic `actor_seq`.
  - Canonical 2-trait invariant (`traits: [PersonalityTrait, PersonalityTrait]` where `traits[0] !== traits[1]`) with Trait 2 zero-division guard, pre-conception validation $|P_A \cup P_B| \ge 2$, novel domestic fallback under 45/45/10, and actionable error `CANNOT_CONCEIVE_INSUFFICIENT_PARENT_TRAITS` under 50/50.
  - Concrete rare encounter category weights (70% Common Domestic, 24% Uncommon Domestic, 5% Rare Domestic, 0.75% Rare Wild across 8 species, 0.25% Mythical Fantasy across 8 forms) and active simulation time pacing (1 real sec = 1 sim min, 60m window, 0 delta when paused/offline).
  - Tasks 01–32 original acceptance criteria preserved 100% byte-for-byte; frozen base `BAR.md` preserved 100% byte-for-byte.
- Exact approved picture versioned and embedded in the spec and handoff.
- Independent review: PASS for planning readiness in docs/reviews/plan-review.md; all material findings resolved.
- Planning validator and six malformed-manifest self-tests pass (`python3 scripts/validate_plan.py all` 100% green).
- Public issue set: 37 open issues with matching bodies and labels, 35 native sub-issue links and 87 prerequisite links; docs/tracker-map.json contains actual identities.
- Linear project: Scope 37, Completed 0. All imported issues assigned to Cats Browser Game. A title change went Linear → GitHub and its restoration went GitHub → Linear, verified at both destinations.
- Genuine GitHub Actions screenshot docs/evidence/planning-checks.png was viewed: correct Cats repository, successful workflow and validate job, no unrelated window. It shows the first published planning check; final checks remain available on the PR.
- No game implementation, runtime tests, backend provisioning or deployment is claimed.

## Remaining product work

Execute all 44 tickets and their acceptance criteria across baseline (Tasks 01–32), family co-op (Tasks 33–38), expanded content, genetics, art, and rare dex (Tasks 39–42), and durable lineage and expanded customization (Tasks 43–44). Three human validation tickets remain open for recipient personalization, fixed-pace balance and playable phone composition. They do not require repeating the accepted product interview.

## Next executable action

Read START-HERE.md, claim GitHub #2 / CATS-2, and implement the first private create/save/resume household slice. Verify actual service APIs and provisioning before writing integration code.

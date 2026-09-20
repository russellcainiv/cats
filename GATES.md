# Gates: Cats model-ready planning package

Scope: Deliver a complete specification, model execution plan, published dependency-ordered tickets, public repository, native Linear sync, and verification evidence. These gates verify the planning package, not a built or released game.

- [x] G1: Every confirmed decision and correction is preserved in the specification and traceability ledger.
  CHECK: python3 scripts/validate_plan.py requirements
  EXPECT: PASS requirements
  EVIDENCE: PASS requirements: 25 decisions covered

- [x] G2: Specification contains complete user stories, explicit design defaults, behavioral contracts, test seams, and full-scope acceptance criteria.
  CHECK: python3 scripts/validate_plan.py spec
  EXPECT: PASS spec
  EVIDENCE: PASS spec: 72 user stories and required sections

- [x] G3: Every ticket is a verifiable vertical slice, all dependency edges resolve, the graph is acyclic, and every requirement has ticket coverage.
  CHECK: python3 scripts/validate_plan.py tickets
  EXPECT: PASS tickets
  EVIDENCE: PASS tickets: 32 files; 87 acyclic prerequisite edges

- [x] G4: A model has a start-here prompt, an executable delivery sequence, asset and persistence contracts, progress instructions, and release gates without claiming implementation evidence.
  CHECK: python3 scripts/validate_plan.py handoff
  EXPECT: PASS handoff
  EVIDENCE: PASS handoff: 32 task plans; exact approved picture; local links resolve

- [x] G5: An independent reviewer checks the package against the conversation's intended scope, identifies defects, and all material findings are resolved.
  EVIDENCE: docs/reviews/plan-review.md — PASS for planning readiness; all material findings resolved, including committed-view API route parity.

- [x] G6: Run final validation and a no-improvement adversarial pass; clearly distinguish prepared ticket drafts, publication, and unbuilt game status.
  CHECK: python3 scripts/validate_plan.py all
  EXPECT: PASS all
  EVIDENCE: PASS self-test: 6 malformed manifests rejected | PASS all: planning integrity only; no game implementation claimed

- [x] G7: Public GitHub repository contains the approved picture, spec, execution plan, instructions, and working planning checks.
  EVIDENCE: https://github.com/russellcainiv/cats — public visibility verified by API; branch codex/cats-planning-setup published; GitHub Actions run 35524827561 passed.

- [x] G8: All implementation and decision issues are published with acceptance criteria, dependencies, labels, and traceable links.
  EVIDENCE: scripts/publish_issues.py verify — 37 open issues, exact canonical bodies, all labels, 35 sub-issue links, 87 native dependency edges; docs/tracker-map.json records identities.

- [x] G9: Linear project is linked to the GitHub work and ongoing synchronization is configured and verified.
  EVIDENCE: docs/linear-setup.md — project Scope 37, Completed 0; native bidirectional mapping; temporary Linear title read through GitHub API, GitHub restoration observed in Linear.

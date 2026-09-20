# Gates: Cats model-ready planning package

Scope: Deliver a complete specification, model execution plan, dependency-ordered local ticket drafts, and verification evidence. These gates verify the planning package, not a built or released game.

- [ ] G1: Every confirmed decision and correction is preserved in the specification and traceability ledger.
  CHECK: python3 scripts/validate_plan.py requirements
  EXPECT: PASS requirements
  EVIDENCE: pending

- [ ] G2: Specification contains complete user stories, explicit design defaults, behavioral contracts, test seams, and full-scope acceptance criteria.
  CHECK: python3 scripts/validate_plan.py spec
  EXPECT: PASS spec
  EVIDENCE: pending

- [ ] G3: Every ticket is a verifiable vertical slice, all dependency edges resolve, the graph is acyclic, and every requirement has ticket coverage.
  CHECK: python3 scripts/validate_plan.py tickets
  EXPECT: PASS tickets
  EVIDENCE: pending

- [ ] G4: A model has a start-here prompt, an executable delivery sequence, asset and persistence contracts, progress instructions, and release gates without claiming implementation evidence.
  CHECK: python3 scripts/validate_plan.py handoff
  EXPECT: PASS handoff
  EVIDENCE: pending

- [ ] G5: An independent reviewer checks the package against the conversation's intended scope, identifies defects, and all material findings are resolved.
  EVIDENCE: pending

- [ ] G6: Run final validation and a no-improvement adversarial pass; clearly distinguish prepared ticket drafts, publication, and unbuilt game status.
  CHECK: python3 scripts/validate_plan.py all
  EXPECT: PASS all
  EVIDENCE: pending

- [ ] G7: Public GitHub repository contains the approved picture, spec, execution plan, instructions, and working planning checks.
  EVIDENCE: pending

- [ ] G8: All implementation and decision issues are published with acceptance criteria, dependencies, labels, and traceable links.
  EVIDENCE: pending

- [ ] G9: Linear project is linked to the GitHub work and ongoing synchronization is configured and verified.
  EVIDENCE: pending

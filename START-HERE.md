# Start here — build Cats from this handoff

Read README.md, the full spec, approved picture, architecture, contracts and ticket index. Then inspect the exact ticket prerequisites and current progress. You do not need the original conversation or a particular model.

## Assignment

Implement the whole agreed browser cat life simulation, in dependency-ready vertical slices, with real interactions, persistence and mobile/desktop parity. Do not stop at a static illustration, a prototype, an unfinished UI or a PR. All confirmed requirements (R01–R32) live in docs/requirements.json; all 44 build tasks live in docs/tickets.json and one Markdown file each under .scratch/cats/issues. Published GitHub identities are recorded in docs/tracker-map.json; Linear synchronization evidence is in docs/linear-setup.md.

## Read in order

1. [Approved picture](docs/art/approved-direction.png) and [art notes](docs/art/README.md).
2. [Specification](.scratch/cats/spec.md).
3. [Domain glossary](CONTEXT.md).
4. [Architecture](docs/architecture.md), [contracts](docs/contracts.md), and relevant ADRs.
5. [Implementation plan](docs/superpowers/plans/2026-09-20-cats.md), [ticket index](docs/ticket-index.md) and [progress](PROGRESS.md).
6. [Co-op Gauntlet addendum](.gauntlet/bar/COOP-ADDENDUM.md).
7. [Content Gauntlet addendum](.gauntlet/bar/CONTENT-ADDENDUM.md).
8. [Lineage and Customization Gauntlet addendum](.gauntlet/bar/LINEAGE-CUSTOMIZATION-ADDENDUM.md).

## Rules for the executor

- Preserve all confirmed scope. Proposed numeric/technical defaults may be improved with evidence; record why and preserve intent. Do not relabel a removal as optimization.
- Begin with the first ticket whose dependencies have actually passed. Claim it and record custody before editing.
- Define acceptance gates before implementation. Test external behavior at the domain/application/browser boundary, including errors and reload.
- Use real provisioned development services for authentication and synced saves. Fixtures are isolated test data, never delivered product fallbacks.
- Keep shared state, save schema, stable IDs and commands consistent. One simulation and one writer per save; no time advancement while absent.
- Every visible action must work. Inspect the rendered app and OPEN all screenshots at desktop and phone widths.
- Independently blind-review against the request, approved art, whole-game mission, UX and regression risks. Fix all material findings.
- Maintain PROGRESS.md and evidence per ticket, including exact commit, tests, viewed screenshots, reviewer verdict and next action.
- Public repo does not authorize public gameplay access, secret exposure, paid resources or messages sent under the owner's name.
- A failed access prerequisite affects only dependent work. Complete everything else and record the exact needed setup; do not substitute a mock and claim success.

## First executable implementation action

Read Task 01 and verify proposed stack versions and available development auth/database provisioning. Establish its narrow real start/create/save/resume workflow, the deterministic test harness and focused test commands before expanding into the renderer.

## Completion boundary

The planning package is not a game. A game ticket closes only when all its criteria and applicable integration/release gates have evidence. The final product is done only after the full dependency graph, independent acceptance, private deployed verification and actual recipient acceptance; never claim the latter from an agent test account.

# Parallel subsystem integration ruling

The user authorized AGY 3.8 Flash and Jules concurrently, maximum useful independent work, and lightweight Git. The full product and acceptance criteria remain unchanged. Subsystem deliveries are integration components; original tickets need full UI/persistence/dogfood before acceptance.

The engine owner's initial schema is in shared-engine-contract.md. It is the starting integration shape, not permission to omit any feature. Features missing from its preliminary command/view list must be added by the integration owner.

## Ownership

- AGY foundation: package/config/lockfiles; src/app, src/server, src/features/access and saves; auth/DB/storage/test provisioning.
- AGY engine: src/domain shared files and core/**; canonical commands/schema/selectors; creation/care/autonomy/navigation/clock/RNG.
- AGY world: src/features/world, ui, creator, onboarding; styles/art/audio and mobile/desktop presentation.
- Building worker: src/domain/building/**, tests/domain/building/**, work/building/**.
- Social worker: src/domain/social/**, tests/domain/social/**, work/social/**. Owns relationship, romance readiness and Moo-Moo completion/conception. Birth and aging belong to lifecycle.
- Economy worker: src/domain/economy/**, tests/domain/economy/**, work/economy/**. Owns hobbies, crops, careers, goals, café, money/catalog transactions.
- Neighborhood worker: src/domain/neighborhood/**, tests/domain/neighborhood/**, work/neighborhood/**. Owns travel/NPCs/visits/shop/adoption/transfers, using economy prices and capacity rules.
- Lifecycle worker: src/domain/lifecycle/**, tests/domain/lifecycle/**, work/lifecycle/**. Owns gestation/birth/ancestry/aging/health/death/memorial/ghosts.

## Atomic cross-system changes

The initial engine proposal returned only a subsystem's state. That is insufficient for cross-system operations (a building purchase debits money, conception reserves household slots, birth creates cats). Use full-world immutable reducers with this adapter shape:

`reduce<StateSystem>(state: WorldState, command: <StateSystem>Command, context: CommandContext): CommandResult`

`advance<StateSystem>(state: WorldState, elapsedSimMinutes: number): WorldState`

Each subsystem exports its own typed command union, a command-type discriminator, initializer and reducer/tick entrypoints from its index.ts. Every rejected command returns the original state; no RNG/money/event side effects on failure. The core dispatch owns idempotency, commits a successful result and validates global invariants. Subsystems use the canonical RNG and stable IDs. Report schema additions in work/<lane>/INTEGRATION.md; do not edit the central state/command/selector files independently. The core owner imports and composes every subsystem after review.

Provide typed local extension interfaces where the preliminary schema lacks required fields. Keep extensions JSON-serializable, bounded and compatible with saved-world migration. Never use any, unchecked casts or fake success as an integration shortcut. Build meaningful focused behavior tests with edge cases. A temporary harness under work/<lane> may provide explicit synthetic scaffolding for missing core imports, but label it clearly and replace it with actual core integration before acceptance.

## Shared invariants and defaults

Living household cats plus reserved litter slots never exceed eight. Every eligible Moo-Moo completion makes exactly one conception draw only when capacity exists; declined or capacity-full encounters never draw conception RNG. Initial tuning is 25%, litter1–3 clamped at conception, gestation3days,150day lifespan with stages10/20/95/25, no player lifespan control. At capacity romance remains available. Ghosts never resurrect cats or consume living slots. While hidden/closed/offline all simulation pauses; no wall-clock catch-up. Free-build-created value never becomes earned currency or earned progress. Matured jobs/harvests/café transactions settle once. All data survives round-trip save and reload.

## Quality

Read the exact spec and original ticket criteria. Never lower them. Work with synthetic fixtures; no private recipient data or credentials. Maintain progress, commit a coherent module and focused tests, and return exact evidence. Do not close original issues from a partial module. For a PR include a screenshot of the passing verification and open/look at it before claiming evidence; UI PRs need affected desktop/phone captures. Codex captures separate evidence for the final gauntlet. Continue autonomously without asking whether to proceed.

# Cats decision map

## Destination

A complete, executable specification and ticket graph for a local model to build the agreed cat life simulation. The implementation tickets carry the build; this map carries only remaining decisions that need empirical or human validation.

## Notes

The product interview and approved art already establish the destination. Do not repeat them. Use the specification's labeled engineering defaults to advance independent implementation. Read grill-with-docs/domain-modeling for true product questions and unlazy for evidence gates. Public GitHub is canonical; Linear mirrors tracking. This map is not a second task list.

## Decisions so far

The confirmed contract is captured in the specification and requirement ledger (R01–R32).
- Requirement R26 (Private family co-op): User CONFIRMED shared household (Option 1) and simultaneous separate devices (phone + computer), with up to four cats per player (eight total in household).
- Requirement R27 (Kitten genetics & inheritance): Percentage-based inheritance of looks and traits (working default 45% Dam / 45% Sire / 10% Novel domestic mutation), parent conception snapshots, and 4-slot-per-player capacity reservations.
- Requirement R28 (Complete reusable GPT Image artwork): All in-game art derived from reusable modular GPT Image originals matching approved pastel cartoon and pixel neighborhood art direction.
- Requirement R29 (Broad cat collection & rare discovery): TICA/CFA grounded domestic breeds, mixed coats, rare wild cats, and mythical fantasy cats; wild and fantasy cats are rarest and found/befriended through exploration only; durable discovery without reload rerolls.
- Requirement R30 (Feline-adapted activities): Career and hobby tasks performed with natural feline paws and jaws (dough kneading, claw digging, paw painting, basket carrying) plus authentic feline instincts (loafing, box napping, grooming, zoomies).
- Requirement R31 (Durable lineage & hybrid naming): Persistent multi-generation lineage graph in WorldState.lineage with DAG acyclicity, 3-generation relatedness/inbreeding prevention guards, and deterministic order-independent hybrid breed naming at birth (e.g. Bengal x Ragdoll -> Ragdal) preserving foundation breeds and generation depth.
- Requirement R32 (Expanded functional customization & furniture): Expanded catalog with at least 64 usable furnishings across four room styles (Cozy Cottage, Modern Cat, Whimsical Play, Rustic Garden), explicit feline need affordances (climbing, scratching, hydration, comfort), reversible swatches, and modular GPT Image rendering with mobile drag/rotate controls.

## Remaining working defaults

1. Multi-actor cat care: Working default is shared care (both players can direct and care for all cats, with visible player reticles and partner indicators).
2. Offspring inheritance odds: Working default is 45% Dam / 45% Sire / 10% Novel domestic catalog (`weighted_novel`). Parameterized configuration supports 50/50 strict parental policy without code changes.
Unexpected balancing or input problems found during real dogfooding may require tuning after a playable slice exists.

## Out of scope

Game implementation within this planning handoff; public multiplayer, multiple neighborhoods, runtime AI, adjustable lifespan, paid random draws, or overturning confirmed decisions without Russell's instruction.

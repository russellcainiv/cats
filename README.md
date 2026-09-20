# Cats

A cute browser life simulation for a household of cats: build their home, follow their personalities, nurture relationships, earn a living, and play through generations.

![Approved art direction](docs/art/approved-direction.png)

**Current state: specification and execution plan. The game is not implemented yet.** The repository is public; the planned game is a private gift with invited testing and automatic phone/computer save continuity.

## Start here

- [Model handoff](START-HERE.md) — what to read, what to build next, and how to prove completion.
- [Full specification](.scratch/cats/spec.md) — complete scope, user stories and acceptance rules.
- [Implementation plan](docs/superpowers/plans/2026-09-20-cats.md) — dependency-ordered tasks and tests.
- [Ticket index](docs/ticket-index.md) — every implementation slice and prerequisite.
- [Architecture](docs/architecture.md) and [integration contracts](docs/contracts.md).
- [Decision map](docs/decision-map.md) — remaining validation decisions, distinct from build tasks.
- [Progress](PROGRESS.md) and [planning gates](GATES.md).

## Non-negotiable game decisions

Full building and decorating; eight cats including kittens; real and fictional cat creation/adoption; autonomy and player direction; careers, hobbies and businesses; earned money/unlocks with optional free-build; one lively neighborhood; fixed aging between normal and slow; death, memorials and occasional ghosts. Moo-Moo requires mutual love and readiness and only has a chance of kittens. At capacity it still works without new pregnancy. Closed games are paused. Every core action works on phone and computer.

## Live trackers

- [Complete specification and build roadmap](https://github.com/russellcainiv/cats/issues/1)
- [All GitHub issues](https://github.com/russellcainiv/cats/issues)
- [Linear project](https://linear.app/rciv/project/cats-browser-game-28162bce1f26/overview)
- [Tracker identities](docs/tracker-map.json) and [sync verification](docs/linear-setup.md)

## Run the planning checks

```sh
python3 scripts/validate_plan.py all
```

This checks document coverage, ticket graph and handoff integrity. It does not run game tests or prove implementation.

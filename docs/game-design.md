# Cats — accepted interview decisions

This is the completed interview record. The [full specification](../.scratch/cats/spec.md), [requirements ledger](requirements.json), and [implementation plan](superpowers/plans/2026-09-20-cats.md) turn these decisions into build instructions. Proposed engineering and balance defaults are identified separately in those documents.

## Product

A cute browser life simulation, made as a private gift for Russell's girlfriend, who loves cats and The Sims. The player directs a whole household of cats with personalities and free will. Care, relationships and funny drama, goals and unlocks, building, and decorating are all core pillars. Computer and phone are equally important.

Cats combine real cat antics with whimsical hobbies, scheduled careers, skills, promotions, and small businesses. Earned money and unlocks drive progression; optional free-build supports creative decorating. Full house construction includes rooms, walls, doors, furniture, and colors. One lively neighborhood includes homes, a café, park, shops, and other cats.

Create real cats with their names, appearance, and personalities, or create/adopt fictional cats. The household holds at most eight living cats, including kittens.

## Time, life and relationships

- The same save automatically follows her between computer and phone. Everything pauses while away; no offline catch-up or off-screen deaths.
- Aging is fixed between normal and slow, not adjustable. Specific durations in the spec are proposed balance values to validate through play.
- Death and permanent loss are explicitly in scope. The earlier no-death suggestion is superseded. Deceased cats receive memorials and occasional ghost visits; ghosts do not resurrect them.
- Cats in love may **Moo-Moo**, initiated by the player or autonomously. Both must be aligned, willing, and in the mood; the other cat may decline.
- Moo-Moo has a chance of kittens, not a guarantee. At the eight-cat capacity, Moo-Moo remains available but cannot start a new pregnancy. Reservation and litter rules are specified in the implementation contract.

## Approved visual direction

Russell rejected the first comparison because all options looked too similar. A replacement board offered distinctly different concepts. He chose **A + B**, blending Candy Cartoon with Pocket Pixel Town, then answered **YES** to the combined GPT Image concept below.

![Approved combined A + B direction](art/approved-direction.png)

The approved direction combines pastel, rounded cartoon cats and furnishings with an overhead cutaway home and a pixel-detailed neighborhood. Build actual interactive scenes and original game assets from this direction. The picture is a reference, not gameplay. Background cats, destination signs, and pictured controls do not override the written scope or household capacity.

## Handoff

Russell asked for everything to be mapped, specified, and ticketed for a local model. This repository contains that implementation package; no model choice or game implementation is part of this setup lane. Public source hosting does not change the private gift audience. See [START-HERE](../START-HERE.md) for execution order and the [decision map](decision-map.md) for recipient details and later playtest approvals that cannot be invented now.

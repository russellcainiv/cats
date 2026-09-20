# Implementation ticket index

Every row is a complete vertical slice. Follow the dependency frontier; these are planned capabilities, not completed implementation. GitHub/Linear links are recorded in tracker-map.json after publication.

| Task | Deliverable | Needs |
|---|---|---|
| 01 | [Create and resume a private saved household](../.scratch/cats/issues/01-private-household.md) | Can start |
| 02 | [Select and move an animated cat in the approved world](../.scratch/cats/issues/02-playable-home.md) | 01 — Create and resume a private saved household |
| 03 | [Resume safely across devices and pause while away](../.scratch/cats/issues/03-sync-and-pause.md) | 01 — Create and resume a private saved household; 02 — Select and move an animated cat in the approved world |
| 04 | [Create real or imaginary cats](../.scratch/cats/issues/04-cat-creator.md) | 02 — Select and move an animated cat in the approved world; 03 — Resume safely across devices and pause while away |
| 05 | [Feed, rest, play and care for cats](../.scratch/cats/issues/05-care.md) | 02 — Select and move an animated cat in the approved world; 03 — Resume safely across devices and pause while away |
| 06 | [Watch personalities and free will shape behavior](../.scratch/cats/issues/06-autonomy.md) | 04 — Create real or imaginary cats; 05 — Feed, rest, play and care for cats |
| 07 | [Buy, place, recolor, move, rotate and sell furniture](../.scratch/cats/issues/07-furniture.md) | 05 — Feed, rest, play and care for cats |
| 08 | [Build the floor plan, rooms and finishes](../.scratch/cats/issues/08-floor-plan.md) | 07 — Buy, place, recolor, move, rotate and sell furniture |
| 09 | [Undo and demolish without trapping cats](../.scratch/cats/issues/09-safe-edits.md) | 08 — Build the floor plan, rooms and finishes |
| 10 | [Offer free-build without money exploits](../.scratch/cats/issues/10-free-build.md) | 07 — Buy, place, recolor, move, rotate and sell furniture; 09 — Undo and demolish without trapping cats |
| 11 | [Paint, improve and sell artwork](../.scratch/cats/issues/11-painting.md) | 05 — Feed, rest, play and care for cats; 07 — Buy, place, recolor, move, rotate and sell furniture |
| 12 | [Grow, harvest and sell produce](../.scratch/cats/issues/12-gardening.md) | 05 — Feed, rest, play and care for cats; 07 — Buy, place, recolor, move, rotate and sell furniture |
| 13 | [Work scheduled careers and earn promotions](../.scratch/cats/issues/13-careers.md) | 05 — Feed, rest, play and care for cats; 11 — Paint, improve and sell artwork |
| 14 | [Complete goals and unlock content](../.scratch/cats/issues/14-goals.md) | 07 — Buy, place, recolor, move, rotate and sell furniture; 11 — Paint, improve and sell artwork; 12 — Grow, harvest and sell produce; 13 — Work scheduled careers and earn promotions |
| 15 | [Travel to a lively persistent neighborhood](../.scratch/cats/issues/15-neighborhood.md) | 06 — Watch personalities and free will shape behavior; 09 — Undo and demolish without trapping cats |
| 16 | [Shop and visit neighborhood homes](../.scratch/cats/issues/16-shops-visits.md) | 15 — Travel to a lively persistent neighborhood; 07 — Buy, place, recolor, move, rotate and sell furniture |
| 17 | [Develop friendships, rivalries and memories](../.scratch/cats/issues/17-friendships.md) | 06 — Watch personalities and free will shape behavior; 15 — Travel to a lively persistent neighborhood |
| 18 | [Fall in love with mutual readiness](../.scratch/cats/issues/18-romance.md) | 17 — Develop friendships, rivalries and memories |
| 19 | [Moo-Moo, chance pregnancy and safe birth](../.scratch/cats/issues/19-moo-moo.md) | 18 — Fall in love with mutual readiness; 04 — Create real or imaginary cats |
| 20 | [Raise kittens and follow generations](../.scratch/cats/issues/20-kittens-family.md) | 19 — Moo-Moo, chance pregnancy and safe birth; 05 — Feed, rest, play and care for cats |
| 21 | [Age at a fixed pace and face old age](../.scratch/cats/issues/21-aging.md) | 20 — Raise kittens and follow generations; 13 — Work scheduled careers and earn promotions |
| 22 | [Treat illness and respond to danger](../.scratch/cats/issues/22-health-hazards.md) | 21 — Age at a fixed pace and face old age; 05 — Feed, rest, play and care for cats |
| 23 | [Memorialize cats and receive ghost visits](../.scratch/cats/issues/23-ghosts.md) | 21 — Age at a fixed pace and face old age; 17 — Develop friendships, rivalries and memories |
| 24 | [Own and operate a cat café](../.scratch/cats/issues/24-cafe.md) | 11 — Paint, improve and sell artwork; 13 — Work scheduled careers and earn promotions; 16 — Shop and visit neighborhood homes; 17 — Develop friendships, rivalries and memories |
| 25 | [Adopt and move adult cats to neighborhood homes](../.scratch/cats/issues/25-adoption-move-out.md) | 04 — Create real or imaginary cats; 15 — Travel to a lively persistent neighborhood; 20 — Raise kittens and follow generations; 21 — Age at a fixed pace and face old age |
| 26 | [Make the private gift welcoming and understandable](../.scratch/cats/issues/26-gift-onboarding.md) | 04 — Create real or imaginary cats; 05 — Feed, rest, play and care for cats; 14 — Complete goals and unlock content; 19 — Moo-Moo, chance pregnancy and safe birth; 25 — Adopt and move adult cats to neighborhood homes |
| 27 | [Complete coherent game art and content](../.scratch/cats/issues/27-art-content.md) | 07 — Buy, place, recolor, move, rotate and sell furniture; 08 — Build the floor plan, rooms and finishes; 11 — Paint, improve and sell artwork; 12 — Grow, harvest and sell produce; 14 — Complete goals and unlock content; 15 — Travel to a lively persistent neighborhood; 16 — Shop and visit neighborhood homes; 19 — Moo-Moo, chance pregnancy and safe birth; 23 — Memorialize cats and receive ghost visits; 24 — Own and operate a cat café |
| 28 | [Finish all controls for touch, keyboard and mouse](../.scratch/cats/issues/28-mobile-accessibility.md) | 10 — Offer free-build without money exploits; 16 — Shop and visit neighborhood homes; 19 — Moo-Moo, chance pregnancy and safe birth; 24 — Own and operate a cat café; 26 — Make the private gift welcoming and understandable; 27 — Complete coherent game art and content |
| 29 | [Survive migrations, corruption and interrupted saves](../.scratch/cats/issues/29-save-recovery.md) | 03 — Resume safely across devices and pause while away; 19 — Moo-Moo, chance pregnancy and safe birth; 21 — Age at a fixed pace and face old age; 24 — Own and operate a cat café |
| 30 | [Balance a complete household lifetime](../.scratch/cats/issues/30-lifetime-balance.md) | 14 — Complete goals and unlock content; 19 — Moo-Moo, chance pregnancy and safe birth; 20 — Raise kittens and follow generations; 21 — Age at a fixed pace and face old age; 22 — Treat illness and respond to danger; 23 — Memorialize cats and receive ghost visits; 24 — Own and operate a cat café; 25 — Adopt and move adult cats to neighborhood homes; 27 — Complete coherent game art and content; 29 — Survive migrations, corruption and interrupted saves |
| 31 | [Blind-review and dogfood the complete game](../.scratch/cats/issues/31-whole-game-verification.md) | 28 — Finish all controls for touch, keyboard and mouse; 30 — Balance a complete household lifetime |
| 32 | [Release the verified private gift](../.scratch/cats/issues/32-private-release.md) | 31 — Blind-review and dogfood the complete game |

## Working rules

ready-for-agent means specified, not dependency-free or completed. A worker must check all prerequisites and claim the issue before starting. Apply independent review, complete dogfooding, viewed desktop/phone captures, regression checks and the applicable release gate to every task. Never close a task as an administrative shortcut.

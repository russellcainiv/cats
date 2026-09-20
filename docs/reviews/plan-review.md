# Blind plan review

**Final verdict: PASS for planning readiness.** The earlier material issues are corrected: fixture assertions read committed cloud state/checksum, the save route owns lease/revision authority, the litter formula is explicit, pause behavior is deterministic, speed was removed from the story, the physical-device evidence procedure is reviewable, and the committed view route is present in both contracts and architecture. The confirmed requirements are represented and the approved image is included and correctly treated as art direction rather than a playable screenshot.

## Findings

### Resolved — Browser examples now prove committed state

The corrected plan now uses `readCommittedView`, revision/checksum assertions, stable IDs, and second-context fencing cases, while retaining the explicit rule that each ticket must add its domain-specific assertions. This resolves the prior false-positive concern, provided implementers preserve that rule when expanding each sample.

### Resolved — Content inventory is synchronized

Architecture and specification now agree on the three careers, two hobbies, seven lots, 30 functional furniture/decor IDs, crops, recipes, NPCs, and goals. Counts remain explicitly proposed defaults.

### Resolved — Capacity reservation formula is explicit

The package now defines `available = 8 - livingCount - reservedSlots`, no conception draw at zero, one draw and a 1–3 litter-size draw on eligible success, clamping to available and reserving the exact count transactionally. Ticket 19 also covers simultaneous capacity operations and atomic birth exchange.

### Resolved — Lease/fencing authority boundary is explicit

`docs/contracts.md` now makes `SaveRequest` and the transactional server save route authoritative, explicitly separating local `CommandContext` from identity/lease proof and defining stale writer behavior.

### Resolved — Pause policy is deterministic

The architecture now specifies foreground frame clamping and discards hidden, close, network-loss, and lease-conflict time; resume requires lease/save reconciliation. The revised browser helpers and review focus provide the deterministic pause/reopen cases.

### Resolved — Device evidence is executable

`docs/device-evidence.md` now defines the desktop/physical-phone matrix, HTTPS allowlisted preview, evidence manifest, screenshot inspection, and explicit `Needs physical <device> verification` fallback. Emulation is correctly supplemental.

### Resolved — Speed story removed

The user story now says pause/resume without a speed setting, matching the fixed-lifespan contract.

### Resolved — The read-only committed view route is synchronized

`docs/contracts.md` and `docs/architecture.md:52-60` both specify authenticated `GET /api/households/[id]/view -> 200 { revision, checksum, view: GameView } | 404 NotFound`, so committed projection assertions and second-device observation have one shared route contract.

## Coverage checks

All R01–R25 appear in the requirements manifest and are referenced by at least one ticket; the dependency graph is acyclic and reaches ticket 32. Tickets consistently include the required UI, domain, persistence, failure-state, desktop/phone, screenshot-review, and blind-review obligations. The planning package is structurally ready for implementation; this review is not implementation or runtime evidence.

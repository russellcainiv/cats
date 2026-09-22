# Lifecycle Subsystem Integration Notes

## Overview

The `lifecycle` subsystem owns the pure domain lifecycle logic for cats in the game:
- Gestation (3 sim days / 4,320 minutes) and Birth (`TRIGGER_BIRTH` command exchanging pregnancy reservation slots for 1-3 kittens).
- Persistent family tree, generation calculation, and inherited coat/color/traits genetics.
- Fixed 150-day lifespan (216,000 sim minutes) with 4 stages: Kitten (10d), Adolescent (20d), Adult (95d), Elder (25d). No slider controls.
- Aging occurs only during active unpaused simulation time (no offline advance).
- Terminal death processing: releases living capacity slot (`livingCatIds`), cancels queued actions & jobs, preserves identity and family tree.
- Retains home and money on final cat death and emits `FINAL_CAT_DIED` event enabling adoption.
- Health hazards, illness, and neglect warning windows (120 sim minutes) before preventable death, rescueable via `INTERVENE_HAZARD` command.
- Memorial records and tombstones placement via `PLACE_MEMORIAL`.
- Seeded night-time ghost visit projections (`DISMISS_GHOST` command). Ghost projections NEVER consume living slots or resurrect deceased cats.

## Module Exports (`src/domain/lifecycle/index.ts`)

```typescript
export * from './types';
export * from './genetics';
export * from './birth';
export * from './aging';
export * from './hazards';
export * from './ghosts';

export function initLifecycleState(): LifecycleSubsystemState;
export function isLifecycleCommand(command: GameCommand): command is LifecycleCommand;
export function reduceLifecycle(state: WorldState, command: LifecycleCommand, context: CommandContext): CommandResult;
export function advanceLifecycle(state: WorldState, elapsedSimMinutes: number): WorldState;
```

## Supported Commands

- `TRIGGER_BIRTH`: `{ type: 'TRIGGER_BIRTH', payload: { pregnancyId: PregnancyId, kittenNames?: string[] } }`
- `INTERVENE_HAZARD`: `{ type: 'INTERVENE_HAZARD', payload: { catId: CatId, treatmentType?: 'vet' | 'care' | 'extinguish' } }`
- `PLACE_MEMORIAL`: `{ type: 'PLACE_MEMORIAL', payload: { deceasedCatId: CatId, lotId: LotId, x: number, y: number } }`
- `DISMISS_GHOST`: `{ type: 'DISMISS_GHOST', payload: { memorialId: MemorialId } }`

## WorldState Integration

Subsystem state lives under `state.lifecycle`:
```typescript
export interface LifecycleSubsystemState {
  pregnancies: Record<PregnancyId, PregnancyRecord>;
  memorials: Record<MemorialId, MemorialRecord>;
  ghosts: GhostProjection[];
  lastGhostCheckNight?: number;
}
```

## Capacity Invariants

- Total occupied slots = `state.livingCatIds.length + sum(unresolvedPregnancy.litterSize)`.
- Total occupied slots MUST NOT exceed 8.

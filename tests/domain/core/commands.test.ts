import { describe, expect, it } from 'vitest';
import { dispatch } from '../../../src/domain/commands';
import { buildScenario } from '../../../src/domain/scenarios';

describe('Command Dispatch and Idempotency', () => {
  it('deduplicates replayed commands using commandId idempotency cache', () => {
    const state = buildScenario('starter');
    const commandId = 'cmd_test_idempotent_01';

    const cmd = {
      type: 'RENAME_HOUSEHOLD' as const,
      payload: { name: 'Happy Whiskers' },
    };

    const first = dispatch(state, cmd, { actorId: 'player', commandId });
    expect(first.ok).toBe(true);
    expect(first.state.householdName).toBe('Happy Whiskers');

    // Replay with same commandId
    const second = dispatch(first.state, cmd, { actorId: 'player', commandId });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.state.householdName).toBe('Happy Whiskers');
      // Events array is empty on deduplicated idempotent return
      expect(second.events.length).toBe(0);
    }
  });

  it('selects cats and orders movements', () => {
    const state = buildScenario('playable-home');

    // Select Cat
    const selectRes = dispatch(
      state,
      { type: 'SELECT_CAT', payload: { catId: 'cat_mochi' } },
      { actorId: 'player', commandId: 'cmd_select_mochi' }
    );
    expect(selectRes.ok).toBe(true);
    expect(selectRes.state.selectedCatId).toBe('cat_mochi');

    // Move Cat to reachable garden spot (4, 2)
    const moveRes = dispatch(
      selectRes.state,
      { type: 'MOVE_CAT', payload: { catId: 'cat_mochi', target: { x: 4, y: 2 } } },
      { actorId: 'player', commandId: 'cmd_move_mochi' }
    );
    expect(moveRes.ok).toBe(true);
    expect(moveRes.state.cats['cat_mochi'].currentAction?.type).toBe('move');
    expect(moveRes.state.cats['cat_mochi'].lastRoute.length).toBeGreaterThan(1);
  });

  it('cancels active and queued actions cleanly', () => {
    const state = buildScenario('playable-home');

    // Set an active move
    const moveRes = dispatch(
      state,
      { type: 'MOVE_CAT', payload: { catId: 'cat_mochi', target: { x: 4, y: 2 } } },
      { actorId: 'player', commandId: 'cmd_move_before_cancel' }
    );
    expect(moveRes.state.cats['cat_mochi'].currentAction).not.toBeNull();

    // Cancel action
    const cancelRes = dispatch(
      moveRes.state,
      { type: 'CANCEL_ACTION', payload: { catId: 'cat_mochi' } },
      { actorId: 'player', commandId: 'cmd_cancel' }
    );
    expect(cancelRes.ok).toBe(true);
    expect(cancelRes.state.cats['cat_mochi'].currentAction).toBeNull();
    expect(cancelRes.state.cats['cat_mochi'].lastRoute.length).toBe(0);
  });

  it('enforces pause and resume states', () => {
    const state = buildScenario('starter');

    const pauseRes = dispatch(
      state,
      { type: 'SET_SIMULATION_PAUSE', payload: { paused: true } },
      { actorId: 'player', commandId: 'cmd_pause' }
    );
    expect(pauseRes.ok).toBe(true);
    expect(pauseRes.state.clock.isPaused).toBe(true);

    const resumeRes = dispatch(
      pauseRes.state,
      { type: 'SET_SIMULATION_PAUSE', payload: { paused: false } },
      { actorId: 'player', commandId: 'cmd_resume' }
    );
    expect(resumeRes.ok).toBe(true);
    expect(resumeRes.state.clock.isPaused).toBe(false);
  });
});

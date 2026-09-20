import {
  WorldState,
  NeighborhoodCommand,
  NeighborhoodSubsystemState,
  CommandContext,
  CommandResult,
} from './types';
import { INITIAL_NEIGHBORHOOD_LOTS } from './lots';
import {
  INITIAL_NPC_CATS,
  INITIAL_SHOP_INVENTORY,
  INITIAL_ADOPTION_CANDIDATES,
} from './npcs';
import { startTravel, cancelTravel, advanceTravelsAndNpcs } from './travel';
import { buyShopItem } from './shop';
import { adoptCat, transferCatToNeighborhood } from './adoption';

export * from './types';
export * from './lots';
export * from './npcs';
export * from './travel';
export * from './shop';
export * from './adoption';

/**
 * Discriminator to check if a game command belongs to the Neighborhood subsystem.
 */
export function isNeighborhoodCommand(cmd: { type: string }): cmd is NeighborhoodCommand {
  return [
    'TRAVEL_TO_LOT',
    'CANCEL_TRAVEL',
    'RETURN_HOME',
    'BUY_SHOP_ITEM',
    'ADOPT_CAT',
    'TRANSFER_CAT_TO_NEIGHBORHOOD',
    'VISIT_LOT',
  ].includes(cmd.type);
}

/**
 * Initializer for the Neighborhood subsystem state.
 */
export function initializeNeighborhoodState(): NeighborhoodSubsystemState {
  return {
    activeLotId: 'lot_home',
    lots: INITIAL_NEIGHBORHOOD_LOTS,
    npcCats: INITIAL_NPC_CATS,
    activeTravels: {},
    shopInventory: INITIAL_SHOP_INVENTORY,
    adoptionCandidates: INITIAL_ADOPTION_CANDIDATES,
    transferredCats: {},
  };
}

export const initializer = initializeNeighborhoodState;

/**
 * Reducer for processing neighborhood commands against full world state.
 * Returns updated WorldState or error result without mutating original state.
 */
export function reduceNeighborhood(
  state: WorldState,
  command: NeighborhoodCommand,
  context: CommandContext
): CommandResult {
  switch (command.type) {
    case 'TRAVEL_TO_LOT':
    case 'VISIT_LOT':
      return startTravel(state, command.payload.catId, command.payload.targetLotId, context);

    case 'CANCEL_TRAVEL':
      return cancelTravel(state, command.payload.catId, context);

    case 'RETURN_HOME':
      return startTravel(state, command.payload.catId, 'lot_home', context, true);

    case 'BUY_SHOP_ITEM':
      return buyShopItem(state, command.payload.catalogId, command.payload.quantity, context);

    case 'ADOPT_CAT':
      return adoptCat(state, command.payload, context);

    case 'TRANSFER_CAT_TO_NEIGHBORHOOD':
      return transferCatToNeighborhood(
        state,
        command.payload.catId,
        command.payload.targetLotId,
        context
      );

    default:
      return {
        ok: false,
        state,
        error: {
          code: 'UNHANDLED_COMMAND',
          message: `Unhandled neighborhood command type: ${(command as { type: string }).type}`,
        },
      };
  }
}

/**
 * Advance tick handler for neighborhood subsystem simulation.
 */
export function advanceNeighborhood(
  state: WorldState,
  elapsedSimMinutes: number
): WorldState {
  return advanceTravelsAndNpcs(state, elapsedSimMinutes);
}

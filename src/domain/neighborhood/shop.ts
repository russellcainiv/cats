import {
  WorldState,
  CommandContext,
  CommandResult,
  InventoryItem,
  DomainEvent,
} from './types';

/**
 * Purchases an item from the neighborhood shop catalog.
 * Debits earned funds from wallet, reduces stock, and adds to player inventory.
 */
export function buyShopItem(
  state: WorldState,
  catalogId: string,
  quantity: number,
  context: CommandContext
): CommandResult {
  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer.' },
    };
  }

  if (!catalogId || typeof catalogId !== 'string' || !catalogId.trim()) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_CATALOG_ID', message: 'Catalog ID must be a non-empty string.' },
    };
  }

  // Find item in shop catalog
  const shopItem = state.neighborhood.shopInventory.find(i => i.catalogId === catalogId);
  if (!shopItem) {
    return {
      ok: false,
      state,
      error: { code: 'ITEM_NOT_FOUND', message: `Shop item ${catalogId} not found.` },
    };
  }

  if (shopItem.stock < quantity) {
    return {
      ok: false,
      state,
      error: {
        code: 'INSUFFICIENT_STOCK',
        message: `Shop has only ${shopItem.stock} of ${shopItem.name} available.`,
      },
    };
  }

  const totalPrice = shopItem.price * quantity;
  if (state.economy.wallet.earnedCash < totalPrice) {
    return {
      ok: false,
      state,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient earned cash. Required: $${totalPrice}, Available: $${state.economy.wallet.earnedCash}.`,
      },
    };
  }

  // Deduct funds
  const updatedWallet = {
    ...state.economy.wallet,
    earnedCash: state.economy.wallet.earnedCash - totalPrice,
  };

  // Reduce stock
  const updatedShopInventory = state.neighborhood.shopInventory.map(item =>
    item.catalogId === catalogId
      ? { ...item, stock: item.stock - quantity }
      : item
  );

  // Add item to inventory
  const existingInventoryItem = state.economy.inventory[catalogId];
  const newQuantity = (existingInventoryItem?.quantity || 0) + quantity;
  const updatedInventoryItem: InventoryItem = {
    id: existingInventoryItem?.id || `inv_${catalogId}`,
    catalogId,
    quantity: newQuantity,
    provenance: 'earned',
  };

  const updatedInventory = {
    ...state.economy.inventory,
    [catalogId]: updatedInventoryItem,
  };

  const buyEvent: DomainEvent = {
    id: `evt_buy_${state.nextEventSequence}`,
    type: 'SHOP_ITEM_PURCHASED',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [context.actorId],
    payload: {
      catalogId,
      quantity,
      unitPrice: shopItem.price,
      totalPrice,
      provenance: 'earned',
    },
  };

  const newState: WorldState = {
    ...state,
    economy: {
      ...state.economy,
      wallet: updatedWallet,
      inventory: updatedInventory,
    },
    neighborhood: {
      ...state.neighborhood,
      shopInventory: updatedShopInventory,
    },
    events: [...state.events, buyEvent],
    nextEventSequence: state.nextEventSequence + 1,
  };

  return { ok: true, state: newState, events: [buyEvent] };
}

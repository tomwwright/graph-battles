import { ID, contains } from '../utils';
import { GameMap, PendingActionType } from '../map';
import { TerritoryAction, TerritoryActionDefinitions } from '../values';

export type TerritoryModelAction = {
  type: 'territory';
  territoryId: ID;
  action: TerritoryAction;
};

export function applyTerritoryAction(map: GameMap, action: TerritoryModelAction) {
  const territory = map.territories.find((territory) => territory.data.id === action.territoryId);
  if (!territory) throw new Error(`Invalid Territory ID ${action.territoryId}`);
  if (!territory.player) throw new Error('applyTerritoryAction on Territory without Player');

  if (action.action && !contains(territory.actions, action.action))
    throw new Error(`Territory ${action.territoryId} cannot take Action ${action.action}`);

  // Refund current action costs
  const currentPending = map.data.pendingActions.find(
    (a) => a.type === PendingActionType.TERRITORY && a.territoryId === action.territoryId
  );
  if (currentPending && currentPending.type === PendingActionType.TERRITORY) {
    const currentDef = TerritoryActionDefinitions[currentPending.action];
    territory.data.food += currentDef.cost.food;
    territory.player.data.gold += currentDef.cost.gold;
  }

  // Remove existing pending action for this territory
  map.data.pendingActions = map.data.pendingActions.filter(
    (a) => !(a.type === PendingActionType.TERRITORY && a.territoryId === action.territoryId)
  );

  // Deduct new action costs and add pending action
  if (action.action) {
    const newDef = TerritoryActionDefinitions[action.action];
    const foodCost = newDef.cost.food;
    const goldCost = newDef.cost.gold;
    if (territory.data.food < foodCost || territory.player.data.gold < goldCost)
      throw new Error(`Territory ${action.territoryId} cannot afford Action ${action.action}`);

    territory.data.food -= foodCost;
    territory.player.data.gold -= goldCost;
    map.data.pendingActions.push({
      type: PendingActionType.TERRITORY,
      territoryId: action.territoryId,
      action: action.action,
    });
  }
}

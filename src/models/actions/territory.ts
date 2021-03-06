import { ID, contains } from 'models/utils';
import GameMap from 'models/map';
import { TerritoryAction, TerritoryActionDefinitions } from 'models/values';

export type TerritoryModelAction = {
  type: 'territory';
  territoryId: ID;
  action: TerritoryAction;
};

export function applyTerritoryAction(map: GameMap, action: TerritoryModelAction) {
  const territory = map.territories.find(territory => territory.data.id === action.territoryId);
  if (!territory) throw new Error(`Invalid Territory ID ${action.territoryId}`);

  if (action.action && !contains(territory.actions, action.action))
    throw new Error(`Territory ${action.territoryId} cannot take Action ${action.action}`);

  territory.setTerritoryAction(action.action);
}

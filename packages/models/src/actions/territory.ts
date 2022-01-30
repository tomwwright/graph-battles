import { ID, contains } from '../utils';
import { GameMap } from '../map';
import { TerritoryAction } from '../values';

export type TerritoryModelAction = {
  type: 'territory';
  territoryId: ID;
  action: TerritoryAction;
};

export function applyTerritoryAction(map: GameMap, action: TerritoryModelAction) {
  checkTerritoryAction(map, action);

  const existingActionForTerritory = map.territory(action.territoryId)?.action;

  if (action.action) {
    map.addAction(action);
  }

  if (existingActionForTerritory) {
    map.removeAction(existingActionForTerritory);
  }
}

function checkTerritoryAction(map: GameMap, action: TerritoryModelAction) {
  const territory = map.territory(action.territoryId);
  if (!territory) throw new Error(`Invalid Territory ID ${action.territoryId}`);

  territory.checkActionValid(action.action);
}

import { ID } from '../utils';
import { GameMap } from '../map';
import { Territory } from '../territory';

export type MoveUnitModelAction = {
  type: 'move-unit';
  unitId: ID;
  destinationId: ID;
};

export function applyMoveUnits(map: GameMap, action: MoveUnitModelAction) {
  const unit = map.unit(action.unitId);

  if (!unit) throw new Error(`Invalid Unit ID ${action.unitId}`);

  const territory = unit.location as Territory;

  if (territory.data.type != 'territory') throw new Error(`Unit ${JSON.stringify(action.unitId)} not on a Territory`);

  if (action.destinationId) {
    const destination = map.territory(action.destinationId);
    if (!destination) throw new Error(`Invalid Territory ID ${action.destinationId}`);

    const adjacentTerritoryIds = territory.edges.map((edge) => edge.other(territory).data.id);
    if (!adjacentTerritoryIds.includes(action.destinationId))
      throw new Error(`Territory ${action.destinationId} not adjacent to Unit ${JSON.stringify(action.unitId)}`);

    unit.data.destinationId = action.destinationId;
  } else {
    unit.data.destinationId = null;
  }
}

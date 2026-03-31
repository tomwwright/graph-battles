import { ID, intersection } from '../utils';
import { GameMap, PendingActionType } from '../map';
import { Territory } from '../territory';

export type MoveUnitsModelAction = {
  type: 'move-units';
  unitIds: ID[];
  destinationId: ID;
};

export function applyMoveUnits(map: GameMap, action: MoveUnitsModelAction) {
  const units = action.unitIds.map((unitId) => map.unit(unitId));

  if (units.some((unit) => unit === undefined)) throw new Error(`Invalid Unit IDs ${JSON.stringify(action.unitIds)}`);

  if (
    units.some(
      (unit) => !unit.location || !map.territories.find((territory) => territory.data.id === unit.location.data.id)
    )
  )
    throw new Error(`Units ${JSON.stringify(action.unitIds)} not all on a Territory`);

  if (action.destinationId) {
    const destination = map.territory(action.destinationId);
    if (!destination) throw new Error(`Invalid Territory ID ${action.destinationId}`);

    const adjacentTerritoryIds = intersection(
      ...units
        .map((unit) => unit.location as Territory)
        .map((territory) => territory.edges.map((edge) => edge.other(territory).data.id))
    );

    if (adjacentTerritoryIds.indexOf(action.destinationId) === -1)
      throw new Error(`Territory ${action.destinationId} not adjacent to all Units ${JSON.stringify(action.unitIds)}`);

    for (const unit of units) {
      // Remove any existing pending move for this unit
      map.data.pendingActions = map.data.pendingActions.filter(
        (a) => !(a.type === PendingActionType.MOVE && a.unitId === unit.data.id)
      );
      // Add the new pending move
      map.data.pendingActions.push({
        type: PendingActionType.MOVE,
        unitId: unit.data.id,
        destinationId: action.destinationId,
      });
    }
  } else {
    // Clear pending moves for these units
    const unitIdSet = new Set(action.unitIds);
    map.data.pendingActions = map.data.pendingActions.filter(
      (a) => !(a.type === PendingActionType.MOVE && unitIdSet.has(a.unitId))
    );
  }
}

import { ID, intersection } from "models/utils";
import GameMap from "models/map";
import Territory from "models/territory";

export type MoveUnitsModelAction = {
  type: "move-units";
  playerId: ID;
  unitIds: ID[];
  destinationId: ID;
};

export function applyMoveUnits(map: GameMap, action: MoveUnitsModelAction) {
  const isPlayerValid = map.data.playerIds.indexOf(action.playerId) > -1;
  if (!isPlayerValid) throw new Error(`Invalid Player ID ${action.playerId}`);

  const destination = map.territories.find(territory => territory.data.id === destination.data.id);
  if (!destination) throw new Error(`Invalid Territory ID ${action.destinationId}`);

  const units = action.unitIds.map(unitId => map.units.find(unit => unit.data.id === unitId));

  if (units.some(unit => unit === undefined)) throw new Error(`Invalid Unit IDs ${JSON.stringify(action.unitIds)}`);

  if (units.some(unit => unit.data.playerId !== action.playerId))
    throw new Error(`Units ${JSON.stringify(action.unitIds)} not all under actioning Player ${action.playerId}`);

  if (
    units.some(
      unit => !unit.location || !map.territories.find(territory => territory.data.id === unit.location.data.id)
    )
  )
    throw new Error(`Units ${JSON.stringify(action.unitIds)} not all on a Territory`);

  const adjacentTerritoryIds = intersection(
    ...units
      .map(unit => unit.location as Territory)
      .map(territory => territory.edges.map(edge => edge.other(territory).data.id))
  );

  if (adjacentTerritoryIds.indexOf(action.destinationId) === -1)
    throw new Error(`Territory ${action.destinationId} not adjacent to all Units ${JSON.stringify(action.unitIds)}`);

  units.forEach(unit => {
    unit.data.destinationId = action.destinationId;
  });
}

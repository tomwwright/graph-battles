import { ID, contains } from "models/utils";
import GameMap from "models/map";
import { TerritoryAction, TerritoryActionDefinitions } from "models/values";

export type TerritoryModelAction = {
  type: "territory";
  playerId: ID;
  territoryId: ID;
  action: TerritoryAction;
};

export function applyTerritoryAction(map: GameMap, action: TerritoryModelAction) {
  const territory = map.territories.find(territory => territory.data.id === action.territoryId);
  if (!territory) throw new Error(`Invalid Territory ID ${action.territoryId}`);

  const player = map.players.find(player => player.data.id === action.playerId);
  if (!player) throw new Error(`Invalid Player ID ${action.playerId}`);

  if (!territory.player || territory.data.playerId !== action.playerId)
    throw new Error(`Player ${action.playerId} is not controlling player of Territory ${action.territoryId}`);
  if (!contains(territory.data.actions, action.action))
    throw new Error(`Territory ${action.territoryId} cannot take Action ${action.action}`);

  territory.setTerritoryAction(action.action);
}

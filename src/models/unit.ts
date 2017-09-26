import { ID, HasID, IDInstance } from "models/utils";
import { GameMap } from "models/map";
// import { Player } from "models/player";
import { UnitContainer } from "models/unitcontainer";
import { Territory } from "models/territory";
// import { Edge } from "models/edge";
import { Status } from "models/values";

export type UnitData = HasID & {
  // playerId: ID;
  locationId: ID;
  destinationId: ID;
  // movementEdgeId: ID;
  statuses: Status[];
  foodConsumption: number;
};

export type Unit = IDInstance & {
  data: UnitData;
  // player: Player;
  location: UnitContainer;
  destination: Territory;
  // movementEdge: Edge;
};

export function createUnit(map: GameMap, data: UnitData): Unit {
  let unit: Unit = {
    // get player(this: Unit) {
    //   return <Player>map.idMap.get(this.playerId);
    // },
    get location(this: Unit) {
      return <UnitContainer>map.idMap[this.data.locationId];
    },
    get destination(this: Unit) {
      return <Territory>map.idMap[this.data.destinationId];
    },
    // get movementEdge(this: Unit) {
    //   return <Edge>map.idMap.get(this.movementEdgeId);
    // },
    data,
    idMap: map.idMap
  };

  return unit;
}

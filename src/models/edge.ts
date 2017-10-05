import { ID, IDInstance } from "models/utils";
import { GameMap } from "models/map";
import { UnitContainerData, UnitContainer } from "models/unitcontainer";
import { Territory } from "models/territory";
import { Unit } from "models/unit";

export type EdgeData = UnitContainerData & {
  territoryAId: ID;
  territoryBId: ID;
};

export type Edge = IDInstance &
  UnitContainer & {
    data: EdgeData;
    territoryA: Territory;
    territoryB: Territory;
  };

export function createEdge(map: GameMap, data: EdgeData): Edge {
  let edge: Edge = {
    get territoryA(this: Edge) {
      return <Territory>map.idMap[this.data.territoryAId];
    },
    get territoryB(this: Edge) {
      return <Territory>map.idMap[this.data.territoryBId];
    },
    get units(this: Edge) {
      return this.data.unitIds.map(id => <Unit>map.idMap[id]);
    },
    data
  };
  return edge;
}

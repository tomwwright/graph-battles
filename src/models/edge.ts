import { ID, Model } from "models/utils";
import GameMap from "models/map";
import UnitContainer, { UnitContainerData } from "models/unitcontainer";
import Territory from "models/territory";

export type EdgeData = UnitContainerData & {
  territoryAId: ID;
  territoryBId: ID;
};

export default class Edge extends Model<EdgeData> {
  get territoryA() {
    return <Territory>this.map.modelMap[this.data.territoryAId];
  }
  get territoryB() {
    return <Territory>this.map.modelMap[this.data.territoryBId];
  }
}

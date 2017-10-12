import { ID, Model } from "models/utils";
import GameMap from "models/map";
import UnitContainer, { UnitContainerData } from "models/unitcontainer";
import Territory from "models/territory";

export type EdgeData = UnitContainerData & {
  territoryAId: ID;
  territoryBId: ID;
};

export default class Edge extends UnitContainer<EdgeData> {
  get territoryA() {
    return <Territory>this.map.modelMap[this.data.territoryAId];
  }
  get territoryB() {
    return <Territory>this.map.modelMap[this.data.territoryBId];
  }

  other(territory: Territory): Territory {
    if (this.data.territoryAId === territory.data.id) return this.territoryB;
    else if (this.data.territoryBId === territory.data.id) return this.territoryA;
    else throw new Error(`Territory ${territory.data.id} not present on Edge ${this.data.id}`);
  }
}

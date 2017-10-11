import { ID, HasID, Model } from "models/utils";
import GameMap from "models/map";
import Player from "models/player";
import UnitContainer from "models/unitcontainer";
import Territory from "models/territory";
import Edge from "models/edge";
import { Status } from "models/values";

export type UnitData = HasID & {
  playerId: ID;
  locationId: ID;
  destinationId: ID;
  movementEdgeId: ID;
  statuses: Status[];
  foodConsumption: number;
};

export default class Unit extends Model<UnitData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId];
  }
  get location() {
    return <UnitContainer>this.map.modelMap[this.data.locationId];
  }
  get destination() {
    return <Territory>this.map.modelMap[this.data.destinationId];
  }
  get movementEdge() {
    return <Edge>this.map.modelMap[this.data.movementEdgeId];
  }
}

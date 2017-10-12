import { ID, HasID, Model, setAdd, setRemove } from "models/utils";
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
    return <Edge | Territory>this.map.modelMap[this.data.locationId];
  }
  get destination() {
    return <Territory>this.map.modelMap[this.data.destinationId];
  }
  get movementEdge() {
    return <Edge>this.map.modelMap[this.data.movementEdgeId];
  }

  setDestinaton(destination: Territory) {
    if (destination) {
      const location: Territory = this.location as Territory;
      if (!location.edges)
        throw new Error(
          `Unable to set destination of Unit ${this.data.id}: Location ${this.location.data.id} not a Territory`
        );

      const adjacentTerritories = location.edges.map(edge => edge.other(location));
      if (!adjacentTerritories.find(territory => territory.data.id === destination.data.id))
        throw new Error(
          `Unable to set destination of Unit ${this.data.id}: Territory ${destination.data
            .id} is not adjacent to Location ${this.location.data.id}`
        );

      this.data.destinationId = destination.data.id;
      this.data.movementEdgeId = location.edges.find(
        edge => edge.other(location).data.id === destination.data.id
      ).data.id;
    } else {
      this.data.destinationId = null;
      this.data.movementEdgeId = null;
    }
  }

  addStatus(status: Status) {
    setAdd(this.data.statuses, status);
  }

  removeStatus(status: Status) {
    setRemove(this.data.statuses, status);
  }
}

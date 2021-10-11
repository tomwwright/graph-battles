import { ID, HasID, Model, include, exclude } from './utils';
import { Player } from './player';
import { Territory } from './territory';
import { Edge } from './edge';
import { Status } from './values';

export type UnitData = HasID & {
  type: 'unit';
  playerId: ID;
  locationId: ID;
  destinationId: ID;
  statuses: Status[];
};

export class Unit extends Model<UnitData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId] || null;
  }
  get location() {
    return <Edge | Territory>this.map.modelMap[this.data.locationId] || null;
  }
  get destination() {
    return <Territory>this.map.modelMap[this.data.destinationId] || null;
  }
  get movementEdge() {
    return (
      this.map.edge(this.data.locationId) || this.map.findEdge(this.data.locationId, this.data.destinationId) || null
    );
  }
  get foodConsumption() {
    return 1;
  }

  resolveMove() {
    if (!this.data.destinationId) throw new Error(`Unit ${this.data.id} moving without destination set`);
    if (!this.destination)
      throw new Error(`Unit ${this.data.id} moving with invalid destination set: ${this.data.destinationId}`);
    if (!this.movementEdge)
      throw new Error(`Unit ${this.data.id} moving to non-adjacent destination: ${this.data.destinationId}`);

    this.location.data.unitIds = exclude(this.location.data.unitIds, this.data.id);

    if (this.data.locationId === this.movementEdge.data.id) {
      this.destination.data.unitIds = include(this.destination.data.unitIds, this.data.id);
      this.data.locationId = this.destination.data.id;
      this.data.destinationId = null;
    } else {
      this.movementEdge.data.unitIds = include(this.movementEdge.data.unitIds, this.data.id);
      this.data.locationId = this.movementEdge.data.id;
    }
  }

  resolveRemoveDefendStatus() {
    if (this.destination) this.removeStatus(Status.DEFEND);
  }

  resolveAddDefendStatus(previous: Unit) {
    if (previous && !previous.data.destinationId) this.addStatus(Status.DEFEND);
  }

  setDestination(destination: Territory) {
    if (destination) {
      const location: Territory = this.location as Territory;
      if (!location.edges)
        throw new Error(
          `Unable to set destination of Unit ${this.data.id}: Location ${this.location.data.id} not a Territory`
        );

      const adjacentTerritories = location.edges.map((edge) => edge.other(location));
      if (!adjacentTerritories.find((territory) => territory.data.id === destination.data.id))
        throw new Error(
          `Unable to set destination of Unit ${this.data.id}: Territory ${destination.data.id} is not adjacent to Location ${this.location.data.id}`
        );

      this.data.destinationId = destination.data.id;
    } else {
      this.data.destinationId = null;
    }
  }

  addStatus(status: Status) {
    this.data.statuses = include(this.data.statuses, status);
  }

  removeStatus(status: Status) {
    this.data.statuses = exclude(this.data.statuses, status);
  }
}

import { ID, HasID, Model, include, exclude } from './utils';
import { Player } from './player';
import { Territory } from './territory';
import { Edge } from './edge';
import { PendingActionType } from './map';
import { Status } from './values';

export type UnitData = HasID & {
  type: 'unit';
  playerId: ID;
  locationId: ID;
  statuses: Status[];
};

export class Unit extends Model<UnitData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId] || null;
  }
  get location() {
    return <Edge | Territory>this.map.modelMap[this.data.locationId] || null;
  }
  get destinationId(): ID | null {
    const pendingMove = this.map.data.pendingActions.find(
      (a) => a.type === PendingActionType.MOVE && a.unitId === this.data.id
    );
    return pendingMove && pendingMove.type === PendingActionType.MOVE ? pendingMove.destinationId : null;
  }
  get destination(): Territory | null {
    const destId = this.destinationId;
    return destId ? <Territory>this.map.modelMap[destId] || null : null;
  }
  get movementEdge() {
    const destId = this.destinationId;
    if (!destId) return null;
    return this.map.edge(this.data.locationId) || this.map.findEdge(this.data.locationId, destId) || null;
  }
  get foodConsumption() {
    return 1;
  }

  addStatus(status: Status) {
    this.data.statuses = include(this.data.statuses, status);
  }

  removeStatus(status: Status) {
    this.data.statuses = exclude(this.data.statuses, status);
  }
}

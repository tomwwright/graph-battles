import { ID, HasID, Model, include, exclude } from './utils';
import { Player } from './player';
import { Territory } from './territory';
import { Edge } from './edge';
import { Status } from './values';
import { MoveUnitModelAction } from './actions';

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

  get destination() {
    if (!this.moveAction) return null;
    return this.map.territory(this.moveAction.destinationId);
  }

  get movementEdge() {
    return (
      this.map.edge(this.data.locationId) ||
      this.map.findEdge(this.data.locationId, this.moveAction?.destinationId) ||
      null
    );
  }

  get moveAction() {
    const action = this.map.data.actions.find((action) => action.type == 'move-unit' && action.unitId == this.data.id);
    return action as MoveUnitModelAction | undefined;
  }

  get foodConsumption() {
    return 1;
  }

  resolveMove() {
    const moveAction = this.moveAction;
    if (!moveAction) throw new Error(`Unit ${this.data.id} moving without move action!`);
    if (!this.destination)
      throw new Error(`Unit ${this.data.id} moving with invalid destination set: ${moveAction.destinationId}`);
    if (!this.movementEdge)
      throw new Error(`Unit ${this.data.id} moving to non-adjacent destination: ${moveAction.destinationId}`);

    if (this.data.locationId === this.movementEdge.data.id) {
      this.data.locationId = this.destination.data.id;
      this.map.removeAction(moveAction);
    } else {
      this.data.locationId = this.movementEdge.data.id;
    }
  }

  resolveRemoveDefendStatus() {
    if (this.destination) this.removeStatus(Status.DEFEND);
  }

  resolveAddDefendStatus(previous: Unit) {
    if (previous && !previous.moveAction) this.addStatus(Status.DEFEND);
  }

  addStatus(status: Status) {
    this.data.statuses = include(this.data.statuses, status);
  }

  removeStatus(status: Status) {
    this.data.statuses = exclude(this.data.statuses, status);
  }
}

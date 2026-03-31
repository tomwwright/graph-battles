import { GameMap } from './map';
import { Status } from './values';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';

let map: GameMap;

describe('Unit Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
  });

  it('getters', () => {
    for (const unit of map.units) {
      expect(unit.location.data.id).to.be.equal(unit.data.locationId, `Unit ${unit.data.id}: Location getter`);

      const destId = unit.destinationId;
      if (destId)
        expect(unit.destination.data.id).to.be.equal(destId, `Unit ${unit.data.id}: destination getter`);
      else expect(unit.destination).to.be.null;

      expect(unit.foodConsumption).to.equal(1, `Unit ${unit.data.id}: foodConsumption getter`);

      // TODO: test movementEdge
    }
  });

  it('destination getter reads from pending moves', () => {
    const unit = map.unit('#UR1');
    expect(unit.destinationId).to.be.null;
    expect(unit.destination).to.be.null;

    const unitWithDest = map.unit('#UR3');
    expect(unitWithDest.destinationId).to.equal('#T2');
    expect(unitWithDest.destination.data.id).to.equal('#T2');
  });

  it('status add and remove', () => {
    const unit = map.unit('#UR1');
    expect(unit.data.statuses).to.have.members([], 'unit has no statuses');
    unit.addStatus(Status.DEFEND);
    expect(unit.data.statuses).to.have.members([Status.DEFEND], 'add defend: unit has defend');
    unit.addStatus(Status.DEFEND);
    expect(unit.data.statuses).to.have.members([Status.DEFEND], 'add defend twice: unit has defend');
    unit.addStatus(Status.STARVE);
    expect(unit.data.statuses).to.have.members(
      [Status.DEFEND, Status.STARVE],
      'add status: unit has defend and starve'
    );
    unit.removeStatus(Status.DEFEND);
    expect(unit.data.statuses).to.have.members([Status.STARVE], 'remove defend: unit has starve');
    unit.removeStatus(Status.DEFEND);
    expect(unit.data.statuses).to.have.members([Status.STARVE], 'remove defend twice: unit has starve');
  });
});

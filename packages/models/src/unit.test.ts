import Unit from './unit';
import GameMap, { GameMapData } from './map';
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

  it('unit objects in the test map', () => {
    expect(map.units.map((unit) => unit.data.id)).to.have.members(map.data.unitIds);
  });

  it('getters', () => {
    for (const unitId of map.data.unitIds) {
      const unit = map.unit(unitId);

      expect(unit.location.data.id).to.be.equal(unit.data.locationId, `Unit ${unit.data.id}: Location getter`);

      if (unit.data.destinationId)
        expect(unit.destination.data.id).to.be.equal(
          unit.data.destinationId,
          `Unit ${unit.data.id}: destination getter`
        );
      else expect(unit.destination).to.be.null;

      expect(unit.foodConsumption).to.equal(1, `Unit ${unit.data.id}: foodConsumption getter`);

      // TODO: test movementEdge
    }
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

  it('set destination', () => {
    const unit = map.unit('#UG1');

    unit.setDestination(null);
    expect(unit.data.destinationId).to.equal(null, 'clearing unit destination');
    unit.setDestination(map.territory('#T4'));
    expect(unit.data.destinationId).to.be.equal('#T4', 'setting to valid destination');

    expect(unit.setDestination.bind(unit, map.territory('#T1'))).to.throw();
  });

  it('move', () => {
    expect(map.unit('#UR1').data.locationId).to.equal('#T1', 'Unit #UR1 initial location');
    expect(
      map.unit('#UR1').resolveMove.bind(map.unit('#UR1')),
      'error on trying to move unit without destination'
    ).to.throw();

    expect(map.unit('#UR3').data.locationId).to.equal('#T1', 'Unit #UR3 initial location');
    expect(map.unit('#UR3').data.destinationId).to.equal('#T2', 'Unit #UR3 initial destination');
    expect(map.unit('#UR3').movementEdge.data.id).to.equal('#E12', 'Unit #UR3 initial movement edge');
    expect(map.unit('#UR3').location.data.unitIds).to.contain('#UR3', 'Unit #UR3 present in initial location');
    map.unit('#UR3').resolveMove();
    expect(map.territory('#T1').data.unitIds).to.not.contain(
      '#UR3',
      'Unit #UR3 not present in initial location post-move'
    );
    expect(map.unit('#UR3').data.locationId).to.equal('#E12', 'Unit #UR3 post-move location');
    expect(map.unit('#UR3').data.destinationId).to.equal('#T2', 'Unit #UR3 post-move destination');
    expect(map.unit('#UR3').movementEdge.data.id).to.equal('#E12', 'Unit #UR3 post-move movement edge');
    expect(map.unit('#UR3').location.data.unitIds).to.contain('#UR3', 'Unit #UR3 present in post-move edge location');
    map.unit('#UR3').resolveMove();
    expect(map.edge('#E12').data.unitIds).to.not.contain(
      '#UR3',
      'Unit #UR3 not present in edge location post-post-move'
    );
    expect(map.unit('#UR3').data.locationId).to.equal('#T2', 'Unit #UR3 post-post-move location is destination');
    expect(map.unit('#UR3').data.destinationId).to.equal(null, 'Unit #UR3 has no destination post-post-move');
    expect(map.unit('#UR3').movementEdge).to.equal(null, 'Unit #UR3 has no movement edge post-post-move');
    expect(map.unit('#UR3').location.data.unitIds).to.contain('#UR3', 'Unit #UR3 present in destination');
  });
});

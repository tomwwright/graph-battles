import { GameMap } from './map';
import { Status, TerritoryAction, TerritoryProperty } from './values';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';
import resolvedMapData from './test/resolvedTestMap';
import combatTestMapData from './test/combatTestMap';

let map: GameMap;
let combatMap: GameMap;

describe('Map Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
    combatMap = new GameMap(clone(combatTestMapData));
  });

  it('getters', () => {
    expect(map.units.map((unit) => unit.data.id)).to.have.members(
      ['#UR1', '#UR2', '#UR3', '#UR4', '#UB1', '#UB2', '#UB3', '#UB4', '#UG1', '#U1'],
      'correct units ids'
    );
    expect(map.territories.map((territory) => territory.data.id)).to.have.members(
      ['#T1', '#T2', '#T3', '#T4', '#T5'],
      'correct territory ids'
    );
    expect(map.edges.map((edge) => edge.data.id)).to.have.members(
      ['#E12', '#E13', '#E23', '#E34', '#E35', '#E45'],
      'correct edge ids'
    );
    expect(map.players.map((player) => player.data.id)).to.have.members(['#PR', '#PB', '#PG'], 'correct player ids');

    for (const edge of map.edges) {
      expect(map.findEdge(edge.data.territoryAId, edge.data.territoryBId).data.id).to.equal(edge.data.id);
      expect(map.findEdge(edge.data.territoryBId, edge.data.territoryAId).data.id).to.equal(edge.data.id);
    }
  });

  it('winning players', () => {
    expect(map.winningPlayers(10, false).map((player) => player.data.id)).to.have.members(['#PG']);
    expect(map.winningPlayers(15, false).map((player) => player.data.id)).to.be.empty;
    expect(map.winningPlayers(25, false).map((player) => player.data.id)).to.be.empty;
    expect(map.winningPlayers(25, true).map((player) => player.data.id)).to.have.members(['#PG']);
  });

  it('add unit', () => {
    expect(map.territory('#T4').units.map((unit) => unit.data.id)).to.have.members(
      ['#U1'],
      'Territory #T4 units correct'
    );
    expect(map.data.nextId).to.equal(0, 'Map starting ID counter correct');

    map.addUnit(map.territory('#T4'));

    expect(map.territory('#T4').units.map((unit) => unit.data.id)).to.have.members(
      ['#U1', '#0'],
      'Territory #T4 units correct'
    );
    expect(map.data.nextId).to.equal(1, 'Map ID counter incremented');
    expect(map.unit('#0').data.playerId).to.equal(null, 'unit added to neutral territory has no player');
    expect(map.units.map((unit) => unit.data.id)).to.contain.members(['#0'], 'new unit added to map units');

    map.addUnit(map.territory('#T1'));

    expect(map.territory('#T1').units.map((unit) => unit.data.id)).to.contain.members(
      ['#1'],
      'Territory #T1 units correct'
    );
    expect(map.data.nextId).to.equal(2, 'Map ID counter incremented');
    expect(map.unit('#1').data.playerId).to.equal(
      map.territory('#T1').data.playerId,
      'unit added to territory has same controlling player'
    );
    expect(map.units.map((unit) => unit.data.id)).to.contain.members(['#1'], 'new unit added to map units');
  });

  it('remove unit', () => {
    const unit = map.unit('#UR1');
    expect(map.territory('#T1').units.map((unit) => unit.data.id)).to.contain('#UR1', 'unit exists on territory');
    expect(map.units.map((unit) => unit.data.id)).to.contain('#UR1', 'unit exists on map');
    expect(unit.data.locationId).to.equal('#T1', 'unit location set to territory');

    map.removeUnit(unit);

    expect(map.territory('#T1').units.map((unit) => unit.data.id)).to.not.contain(
      '#UR1',
      'unit removed from territory'
    );
    expect(map.units.map((unit) => unit.data.id)).to.not.contain('#UR1', 'unit removed from map');
    expect(unit.data.locationId).to.equal(null, 'unit location unset');
  });
});

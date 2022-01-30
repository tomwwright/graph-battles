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
    expect(map.winningPlayers(10, false).map((player) => player.data.id)).to.have.members(['#PB', '#PG']);
    expect(map.winningPlayers(15, false).map((player) => player.data.id)).to.be.empty;
    expect(map.winningPlayers(25, false).map((player) => player.data.id)).to.be.empty;
    expect(map.winningPlayers(25, true).map((player) => player.data.id)).to.have.members(['#PB', '#PG']);
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

  it('resolve turn', () => {
    map.resolveTurn();

    expect(map.data).to.deep.equal(resolvedMapData);
  });

  it('resolve gold', () => {
    expect(map.player('#PR').data.gold).to.equal(5, 'red player starting gold');
    expect(map.player('#PB').data.gold).to.equal(3, 'blue player starting gold');
    expect(map.player('#PG').data.gold).to.equal(10, 'green player starting gold');

    map.resolveGold();

    expect(map.player('#PR').data.gold).to.equal(5 + 0, 'red player resolved gold');
    expect(map.player('#PB').data.gold).to.equal(3 + 2, 'blue player resolved gold');
    expect(map.player('#PG').data.gold).to.equal(10 + 1, 'green player resolved gold');
  });

  it('resolve food', () => {
    expect(map.unit('#UR1').data.statuses).to.not.contain(Status.STARVE, 'Unit #UR1 not starving before resolve food');
    expect(map.unit('#UR2').data.statuses).to.not.contain(Status.STARVE, 'Unit #UR2 not starving before resolve food');
    expect(map.unit('#UR3').data.statuses).to.not.contain(Status.STARVE, 'Unit #UR3 not starving before resolve food');
    expect(map.unit('#UR4').data.statuses).to.not.contain(Status.STARVE, 'Unit #UR4 not starving before resolve food');
    expect(map.unit('#UB1').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB1 not starving before resolve food');
    expect(map.unit('#UB2').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB2 not starving before resolve food');
    expect(map.unit('#UB3').data.statuses).to.contain(Status.STARVE, 'Unit #UB3 starving before resolve food');
    expect(map.unit('#UB4').data.statuses).to.contain(Status.STARVE, 'Unit #UB4 starving before resolve food');
    expect(map.unit('#UG1').data.statuses).to.not.contain(Status.STARVE, 'Unit #UG1 not starving before resolve food');
    expect(map.unit('#U1').data.statuses).to.not.contain(Status.STARVE, 'Unit #U1 not starving before resolve food');

    // modify Territory #T1 food to give the starving conditions we need
    map.territory('#T1').data.food = 0;

    expect(map.territory('#T1').data.food).to.equal(0, 'Territory #T1 has correct initial food');
    expect(map.territory('#T2').data.food).to.equal(3, 'Territory #T2 has correct initial food');
    expect(map.territory('#T3').data.food).to.equal(3, 'Territory #T3 has correct initial food');
    expect(map.territory('#T4').data.food).to.equal(3, 'Territory #T4 has correct initial food');
    expect(map.territory('#T5').data.food).to.equal(6, 'Territory #T5 has correct initial food');

    map.resolveFood();

    expect(map.unit('#UR1').data.statuses).to.contain(Status.STARVE, 'Unit #UR1 starving after resolve food');
    expect(map.unit('#UR2').data.statuses).to.contain(Status.STARVE, 'Unit #UR2 starving after resolve food');
    expect(map.unit('#UR3').data.statuses).to.contain(Status.STARVE, 'Unit #UR3 starving after resolve food');
    expect(map.unit('#UR4').data.statuses).to.not.contain(Status.STARVE, 'Unit #UR4 not starving after resolve food');
    expect(map.unit('#UB1').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB1 not starving after resolve food');
    expect(map.unit('#UB2').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB2 not starving after resolve food');
    expect(map.unit('#UB3').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB3 not starving after resolve food');
    expect(map.unit('#UB4').data.statuses).to.not.contain(Status.STARVE, 'Unit #UB4 not starving after resolve food');
    expect(map.unit('#UG1').data.statuses).to.not.contain(Status.STARVE, 'Unit #UG1 not starving after resolve food');
    expect(map.unit('#U1').data.statuses).to.not.contain(Status.STARVE, 'Unit #U1 not starving after resolve food');

    expect(map.territory('#T1').data.food).to.equal(
      0,
      'Territory #T1 has correct resolved food: caps at zero, units starve'
    );
    expect(map.territory('#T2').data.food).to.equal(3, 'Territory #T2 has correct resolved food');
    expect(map.territory('#T3').data.food).to.equal(0, 'Territory #T3 has correct resolved food: exactly zero');
    expect(map.territory('#T4').data.food).to.equal(3, 'Territory #T4 has correct resolved food');
    expect(map.territory('#T5').data.food).to.equal(7, 'Territory #T5 has correct resolved food: caps at max');
  });

  it('resolve removing defend status', () => {
    expect(map.unit('#UR1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR1 initially not defending');
    expect(map.unit('#UR2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR2 initially not defending');
    expect(map.unit('#UR3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR3 initially not defending');
    expect(map.unit('#UR4').data.statuses).to.contain(Status.DEFEND, 'Unit #UR4 initially defending');
    expect(map.unit('#UB1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB1 initially not defending');
    expect(map.unit('#UB2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB2 initially not defending');
    expect(map.unit('#UB3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB3 initially not defending');
    expect(map.unit('#UB4').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB4 initially not defending');
    expect(map.unit('#UG1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UG1 initially not defending');
    expect(map.unit('#U1').data.statuses).to.contain(Status.DEFEND, 'Unit #U1 initially defending');

    map.resolveRemoveDefendStatus();

    expect(map.unit('#UR1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR1 post-resolve not defending');
    expect(map.unit('#UR2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR2 post-resolve not defending');
    expect(map.unit('#UR3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR3 post-resolve not defending');
    expect(map.unit('#UR4').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR4 post-resolve not defending');
    expect(map.unit('#UB1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB1 post-resolve not defending');
    expect(map.unit('#UB2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB2 post-resolve not defending');
    expect(map.unit('#UB3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB3 post-resolve not defending');
    expect(map.unit('#UB4').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB4 post-resolve not defending');
    expect(map.unit('#UG1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UG1 post-resolve not defending');
    expect(map.unit('#U1').data.statuses).to.contain(Status.DEFEND, 'Unit #U1 post-resolve defending');
  });

  it('resolve adding defend status', () => {
    expect(map.unit('#UR1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR1 initial defend');
    expect(map.unit('#UR2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR2 initial defend');
    expect(map.unit('#UR3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR3 initial defend');
    expect(map.unit('#UR4').data.statuses).to.contain(Status.DEFEND, 'Unit #UR4 initial defend');
    expect(map.unit('#UB1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB1 initial defend');
    expect(map.unit('#UB2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB2 initial defend');
    expect(map.unit('#UB3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB3 initial defend');
    expect(map.unit('#UB4').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB4 initial defend');
    expect(map.unit('#UG1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UG1 initial defend');
    expect(map.unit('#U1').data.statuses).to.contain(Status.DEFEND, 'Unit #U1 initial defend');

    const resolved = new GameMap(clone(map.data));
    resolved.resolveMoves();
    resolved.resolveAddDefendStatus(map);

    expect(resolved.unit('#UR1').data.statuses).to.contain(Status.DEFEND, 'Unit #UR1 post-resolve defend');
    expect(resolved.unit('#UR2').data.statuses).to.contain(Status.DEFEND, 'Unit #UR2 post-resolve defend');
    expect(resolved.unit('#UR3').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UR3 post-resolve defend');
    expect(resolved.unit('#UR4').data.statuses).to.contain(Status.DEFEND, 'Unit #UR4 post-resolve defend');
    expect(resolved.unit('#UB1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB1 post-resolve defend');
    expect(resolved.unit('#UB2').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB2 post-resolve defend');
    expect(resolved.unit('#UB3').data.statuses).to.contain(Status.DEFEND, 'Unit #UB3 post-resolve defend');
    expect(resolved.unit('#UB4').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UB4 post-resolve defend');
    expect(resolved.unit('#UG1').data.statuses).to.not.contain(Status.DEFEND, 'Unit #UG1 post-resolve defend');
    expect(resolved.unit('#U1').data.statuses).to.contain(Status.DEFEND, 'Unit #U1 post-resolve defend');
  });

  it('resolve moves', () => {
    expect(map.unit('#UR1').data.locationId).to.equal('#T1', 'Unit #UR1 initial location');
    expect(map.unit('#UR2').data.locationId).to.equal('#T1', 'Unit #UR2 initial location');
    expect(map.unit('#UR3').data.locationId).to.equal('#T1', 'Unit #UR3 initial location');
    expect(map.unit('#UR4').data.locationId).to.equal('#T2', 'Unit #UR4 initial location');
    expect(map.unit('#UB1').data.locationId).to.equal('#T3', 'Unit #UB1 initial location');
    expect(map.unit('#UB2').data.locationId).to.equal('#T3', 'Unit #UB2 initial location');
    expect(map.unit('#UB3').data.locationId).to.equal('#T3', 'Unit #UB3 initial location');
    expect(map.unit('#UB4').data.locationId).to.equal('#T3', 'Unit #UB4 initial location');
    expect(map.unit('#UG1').data.locationId).to.equal('#T5', 'Unit #UG1 initial location');
    expect(map.unit('#U1').data.locationId).to.equal('#T4', 'Unit #U1 initial location');

    map.resolveMoves();

    expect(map.unit('#UR1').data.locationId).to.equal('#T1', 'Unit #UR1 post-move location');
    expect(map.unit('#UR2').data.locationId).to.equal('#T1', 'Unit #UR2 post-move location');
    expect(map.unit('#UR3').data.locationId).to.equal('#T2', 'Unit #UR3 post-move location');
    expect(map.unit('#UR4').data.locationId).to.equal('#E23', 'Unit #UR4 post-move location');
    expect(map.unit('#UB1').data.locationId).to.equal('#E23', 'Unit #UB1 post-move location');
    expect(map.unit('#UB2').data.locationId).to.equal('#E23', 'Unit #UB2 post-move location');
    expect(map.unit('#UB3').data.locationId).to.equal('#T3', 'Unit #UB3 post-move location');
    expect(map.unit('#UB4').data.locationId).to.equal('#T4', 'Unit #UB4 post-move location');
    expect(map.unit('#UG1').data.locationId).to.equal('#T4', 'Unit #UG1 post-move location');
    expect(map.unit('#U1').data.locationId).to.equal('#T4', 'Unit #U1 post-move location');

    // remove Unit #UR4 from Edge #E23 so that it is no longer a combat location and the move there can resolve
    map.removeUnit(map.unit('#UR4'));
    map.resolveMoves();

    expect(map.unit('#UB1').data.locationId).to.equal('#T2', 'Unit #UB1 post-post-move location');
    expect(map.unit('#UB2').data.locationId).to.equal('#T2', 'Unit #UB2 post-post-move location');
  });

  it('resolve territory actions', () => {
    expect(map.territory('#T1').action.action).to.equal(
      TerritoryAction.CREATE_UNIT,
      'Territory #T3 initial current action'
    );
    expect(map.territory('#T1').units).to.have.length(3, 'Territory #T1 initial number of units');
    expect(map.territory('#T1').data.food).to.equal(3, 'Territory #T1 initial food');

    expect(map.territory('#T2').action.action).to.equal(
      TerritoryAction.CREATE_UNIT,
      '#T2 has the Create Unit action set'
    );
    expect(map.territory('#T2').units).to.have.length(1, '#T2 has a 1 unit initially');
    expect(map.territory('#T2').data.food).to.equal(3, 'Territory #T2 initial food');
    expect(map.territory('#T2').player.data.gold).to.equal(5, 'Territory #T2 controller initial gold');

    expect(map.territory('#T3').action.action).to.equal(
      TerritoryAction.BUILD_SETTLEMENT,
      'Territory #T3 initial current action'
    );
    expect(map.territory('#T3').hasProperty(TerritoryProperty.SETTLED)).to.equal(
      false,
      'Territory #T3 settled property'
    );
    expect(map.territory('#T3').data.food).to.equal(3, 'Territory #T3 initial food');
    expect(map.territory('#T3').player.data.gold).to.equal(3, 'Territory #T3 controller initial gold');

    map.resolveTerritoryActions();

    expect(map.territory('#T1').action).to.equal(null, 'Territory #T1 post-resolve current action');
    expect(map.territory('#T1').units).to.have.length(
      3,
      '#T1 still has 3 units because opposing units stifled the Create Unit'
    );
    expect(map.territory('#T1').data.food).to.equal(0, 'Territory #T1 food still paid even though action stifled');

    expect(map.territory('#T2').action).to.equal(null, '#T2 post-resolve current action is cleared');
    expect(map.territory('#T2').units).to.have.length(2, '#T2 has a new unit created by Create Unit');
    expect(map.territory('#T2').data.food).to.equal(0, 'Territory #T2 food paid');
    expect(map.territory('#T2').player.data.gold).to.equal(5, 'Territory #T2 controller gold paid');

    expect(map.territory('#T3').action).to.equal(null, 'Territory #T3 post-resolve current action');
    expect(map.territory('#T3').hasProperty(TerritoryProperty.SETTLED)).to.equal(
      true,
      'Territory #T3 settled property post-resolve'
    );
    expect(map.territory('#T3').data.food).to.equal(3, 'Territory #T3 food paid');
    expect(map.territory('#T3').player.data.gold).to.equal(0, 'Territory #T3 controller gold paid');
  });

  it('resolve territory control', () => {
    const preresolveMap = new GameMap(clone(testMapData));

    expect(preresolveMap.territory('#T1').data.playerId).to.equal('#PB', 'Territory #T1 initial controller');
    expect(preresolveMap.territory('#T2').data.playerId).to.equal('#PR', 'Territory #T2 initial controller');
    expect(preresolveMap.territory('#T3').data.playerId).to.equal('#PB', 'Territory #T3 initial controller');
    expect(preresolveMap.territory('#T4').data.playerId).to.equal(null, 'Territory #T4 initial controller');
    expect(preresolveMap.territory('#T5').data.playerId).to.equal('#PG', 'Territory #T5 initial controller');

    map.resolveMoves();
    map.resolveTerritoryControl(preresolveMap);

    expect(map.territory('#T1').data.playerId).to.equal('#PR', 'Territory #T1 post-resolve controller');
    expect(map.territory('#T2').data.playerId).to.equal('#PR', 'Territory #T2 post-resolve controller');
    expect(map.territory('#T3').data.playerId).to.equal('#PB', 'Territory #T3 post-resolve controller');
    expect(map.territory('#T4').data.playerId).to.equal(null, 'Territory #T4 post-resolve controller');
    expect(map.territory('#T5').data.playerId).to.equal('#PG', 'Territory #T5 post-resolve controller');
  });
});

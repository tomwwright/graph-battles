import { GameMap } from './map';
import { Status, TerritoryAction, TerritoryProperty } from './values';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';
import resolvedMapData from './test/resolvedTestMap';
import combatTestMapData from './test/combatTestMap';
import { resolveAddDefendStatus, resolveFood, resolveGold, resolveMoves, resolveTerritoryActions, resolveTerritoryControl, resolveTurnSync } from './resolver';

let map: GameMap;
let combatMap: GameMap;

describe('Resolver', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
    combatMap = new GameMap(clone(combatTestMapData));
  });

  it('resolve turn', () => {
    resolveTurnSync(map);

    expect(map.data).to.deep.equal(resolvedMapData);
  });

  it('resolve gold', () => {
    expect(map.player('#PR').data.gold).to.equal(5, 'red player starting gold');
    expect(map.player('#PB').data.gold).to.equal(1, 'blue player starting gold');
    expect(map.player('#PG').data.gold).to.equal(10, 'green player starting gold');

    resolveGold(map);

    expect(map.player('#PR').data.gold).to.equal(5 + 0 + 0, 'red player resolved gold');
    expect(map.player('#PB').data.gold).to.equal(1 + 1 + 2, 'blue player resolved gold');
    expect(map.player('#PG').data.gold).to.equal(10 + 2 + 1, 'green player resolved gold');
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

    expect(map.territory('#T1').data.food).to.equal(0, 'Territory #T1 has correct initial food');
    expect(map.territory('#T2').data.food).to.equal(2, 'Territory #T2 has correct initial food');
    expect(map.territory('#T3').data.food).to.equal(3, 'Territory #T3 has correct initial food');
    expect(map.territory('#T4').data.food).to.equal(3, 'Territory #T4 has correct initial food');
    expect(map.territory('#T5').data.food).to.equal(6, 'Territory #T5 has correct initial food');

    resolveFood(map);

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
    expect(map.territory('#T2').data.food).to.equal(2, 'Territory #T2 has correct resolved food');
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

    resolveRemoveDefendStatus(map);

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
    resolveMoves(resolved);
    resolveAddDefendStatus(resolved, map);

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

    resolveMoves(map);

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
    resolveMoves(map);

    expect(map.unit('#UB1').data.locationId).to.equal('#T2', 'Unit #UB1 post-post-move location');
    expect(map.unit('#UB2').data.locationId).to.equal('#T2', 'Unit #UB2 post-post-move location');
  });

  it('resolve territory actions', () => {
    expect(map.territory('#T1').data.currentAction).to.equal(
      TerritoryAction.CREATE_UNIT,
      'Territory #T3 initial current action'
    );
    expect(map.territory('#T1').units).to.have.length(3, 'Territory #T1 initial number of units');
    expect(map.territory('#T2').data.currentAction).to.equal(
      TerritoryAction.CREATE_UNIT,
      '#T2 has the Create Unit action set'
    );
    expect(map.territory('#T2').units).to.have.length(1, '#T2 has a 1 unit initially');
    expect(map.territory('#T3').data.currentAction).to.equal(
      TerritoryAction.BUILD_SETTLEMENT,
      'Territory #T3 initial current action'
    );
    expect(map.territory('#T3').hasProperty(TerritoryProperty.SETTLED)).to.equal(
      false,
      'Territory #T3 settled property'
    );

    resolveTerritoryActions(map);

    expect(map.territory('#T1').data.currentAction).to.equal(null, 'Territory #T1 post-resolve current action');
    expect(map.territory('#T1').units).to.have.length(
      3,
      '#T1 still has 3 units because opposing units stifled the Create Unit'
    );
    expect(map.territory('#T2').data.currentAction).to.equal(null, '#T2 post-resolve current action is cleared');
    expect(map.territory('#T2').units).to.have.length(2, '#T2 has a new unit created by Create Unit');
    expect(map.territory('#T3').data.currentAction).to.equal(null, 'Territory #T3 post-resolve current action');
    expect(map.territory('#T3').hasProperty(TerritoryProperty.SETTLED)).to.equal(
      true,
      'Territory #T3 settled property post-resolve'
    );
  });

  it('resolve territory control', () => {
    const preresolveMap = new GameMap(clone(testMapData));

    expect(preresolveMap.territory('#T1').data.playerId).to.equal('#PB', 'Territory #T1 initial controller');
    expect(preresolveMap.territory('#T2').data.playerId).to.equal('#PR', 'Territory #T2 initial controller');
    expect(preresolveMap.territory('#T3').data.playerId).to.equal('#PB', 'Territory #T3 initial controller');
    expect(preresolveMap.territory('#T4').data.playerId).to.equal(null, 'Territory #T4 initial controller');
    expect(preresolveMap.territory('#T5').data.playerId).to.equal('#PG', 'Territory #T5 initial controller');

    expect(preresolveMap.territory('#T1').data.currentAction).to.equal(
      TerritoryAction.CREATE_UNIT,
      'Territory #T1 initial current action'
    );
    expect(preresolveMap.territory('#T2').data.currentAction).to.equal(
      TerritoryAction.CREATE_UNIT,
      'Territory #T2 initial current action'
    );
    expect(preresolveMap.territory('#T3').data.currentAction).to.equal(
      TerritoryAction.BUILD_SETTLEMENT,
      'Territory #T3 initial current action'
    );
    expect(preresolveMap.territory('#T4').data.currentAction).to.equal(null, 'Territory #T4 initial current action');
    expect(preresolveMap.territory('#T5').data.currentAction).to.equal(null, 'Territory #T5 initial current action');

    resolveMoves(map);
    resolveTerritoryControl(map, preresolveMap);

    expect(map.territory('#T1').data.playerId).to.equal('#PR', 'Territory #T1 post-resolve controller');
    expect(map.territory('#T2').data.playerId).to.equal('#PR', 'Territory #T2 post-resolve controller');
    expect(map.territory('#T3').data.playerId).to.equal('#PB', 'Territory #T3 post-resolve controller');
    expect(map.territory('#T4').data.playerId).to.equal(null, 'Territory #T4 post-resolve controller');
    expect(map.territory('#T5').data.playerId).to.equal('#PG', 'Territory #T5 post-resolve controller');

    expect(map.territory('#T1').data.currentAction).to.equal(null, 'Territory #T1 post-resolve current action');
    expect(map.territory('#T2').data.currentAction).to.equal(
      TerritoryAction.CREATE_UNIT,
      'Territory #T2 post-resolve current action'
    );
    expect(map.territory('#T3').data.currentAction).to.equal(
      TerritoryAction.BUILD_SETTLEMENT,
      'Territory #T3 post-resolve current action'
    );
    expect(map.territory('#T4').data.currentAction).to.equal(null, 'Territory #T4 post-resolve current action');
    expect(map.territory('#T5').data.currentAction).to.equal(null, 'Territory #T5 post-resolve current action');
  });
});
function resolveRemoveDefendStatus(map: GameMap) {
  throw new Error('Function not implemented.');
}


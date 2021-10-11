import Combat from 'models/combat';
import GameMap, { GameMapData } from 'models/map';
import { Status } from 'models/values';
import { clone } from "models/utils";
import { expect } from 'chai';
import { describe, it, beforeEach } from "mocha";

import combatTestMapData from "models/test/combatTestMap";

let map: GameMap;

describe('Combat Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(combatTestMapData));
  });

  it('combat locations in the test map', () => {
    expect(map.getCombats().map(combat => combat.location.data.id)).to.have.members(["#E23", "#T4"], 'combat locations in the test map');
  });

  it('combat rating', () => {
    const combats = map.getCombats();

    // Edge #E23
    expect(combats[0].combatants.map(combatant => combatant.combatRating)).to.have.members([4, 2], 'combatants have correct combat ratings');

    // Territory #T4
    expect(combats[1].combatants.map(combatant => combatant.combatRating)).to.have.members([3, 2, 1], 'combatants have correct combat ratings');
  });

  it('resolve', () => {
    const combats = map.getCombats();

    // Edge #E23
    expect(combats[0].combatants[0].player.units.map(unit => unit.data.id)).to.contain("#UB2");
    expect(combats[0].combatants[1].player.units.map(unit => unit.data.id)).to.contain("#UR4");
    expect(combats[0].resolve().map(unit => unit.data.id)).to.have.members(["#UB2", "#UR4"]);
    expect(combats[0].combatants[0].player.units.map(unit => unit.data.id)).to.not.contain("#UB2");
    expect(combats[0].combatants[0].player.units.map(unit => unit.data.id)).to.contain("#UB1");
    expect(combats[0].location.units.map(unit => unit.data.id)).to.not.contain(["#UB2", "#UR4"]);
    expect(map.units.map(unit => unit.data.id)).to.not.contain(["#UB2", "#UR4"]);

    // Territory #T4
    expect(combats[1].combatants[0].units.map(unit => unit.data.id)).to.contain("#U1");
    expect(combats[1].combatants[1].player.units.map(unit => unit.data.id)).to.contain("#UG1");
    expect(combats[1].combatants[2].player.units.map(unit => unit.data.id)).to.contain("#UB4");
    expect(combats[1].resolve().map(unit => unit.data.id)).to.have.members(["#UG1", "#UB4"]);
    expect(combats[1].combatants[1].player.units.map(unit => unit.data.id)).to.not.contain("#UG1");
    expect(combats[1].combatants[2].player.units.map(unit => unit.data.id)).to.not.contain("#UB4");
    expect(combats[1].location.units.map(unit => unit.data.id)).to.not.contain(["#UG1", "#UB4"]);
    expect(map.units.map(unit => unit.data.id)).to.not.contain(["#UG1", "#UB4"]);
  });
});



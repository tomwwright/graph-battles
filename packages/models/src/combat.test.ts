import { GameMap } from './map';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import combatTestMapData from './test/combatTestMap';

let map: GameMap;

describe('Combat Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(combatTestMapData));
  });

  it('combat locations in the test map', () => {
    expect(map.getCombats().map((combat) => combat.location.data.id)).to.have.members(
      ['#E23', '#T4'],
      'combat locations in the test map'
    );
  });

  it('combat rating', () => {
    const combats = map.getCombats();

    // Edge #E23
    expect(combats[0].combatants.map((combatant) => combatant.combatRating)).to.have.members(
      [4, 2],
      'combatants have correct combat ratings'
    );

    // Territory #T4
    expect(combats[1].combatants.map((combatant) => combatant.combatRating)).to.have.members(
      [3, 2, 1],
      'combatants have correct combat ratings'
    );
  });

  it('outcome preview matches resolve retention', () => {
    const combats = map.getCombats();

    // Edge #E23: ratings 4 vs 2 -> retain ceil((4-2)/2) = 1, winner is top combatant
    const e23Outcome = combats[0].outcome();
    expect(e23Outcome.retainedCount).to.equal(1);
    expect(e23Outcome.winner).to.equal(combats[0].combatants[0]);

    // Territory #T4: ratings 3 vs 2 vs 1 -> retain ceil((3-2)/2) = 1
    const t4Outcome = combats[1].outcome();
    expect(t4Outcome.retainedCount).to.equal(1);
    expect(t4Outcome.winner).to.equal(combats[1].combatants[0]);
  });

  it('outcome with fewer than two combatants has no winner', () => {
    // Synthesise by clearing combatants after construction — pure-function test
    const combats = map.getCombats();
    const combat = combats[0];
    combat.combatants = [combat.combatants[0]];
    const outcome = combat.outcome();
    expect(outcome.winner).to.equal(null);
    expect(outcome.retainedCount).to.equal(0);
  });

  it('resolve', () => {
    const combats = map.getCombats();

    // Edge #E23
    expect(combats[0].combatants[0].player.units.map((unit) => unit.data.id)).to.contain('#UB2');
    expect(combats[0].combatants[1].player.units.map((unit) => unit.data.id)).to.contain('#UR4');
    expect(combats[0].resolve().map((unit) => unit.data.id)).to.have.members(['#UB2', '#UR4']);
    expect(combats[0].combatants[0].player.units.map((unit) => unit.data.id)).to.not.contain('#UB2');
    expect(combats[0].combatants[0].player.units.map((unit) => unit.data.id)).to.contain('#UB1');
    expect(combats[0].location.units.map((unit) => unit.data.id)).to.not.contain(['#UB2', '#UR4']);
    expect(map.units.map((unit) => unit.data.id)).to.not.contain(['#UB2', '#UR4']);

    // Territory #T4
    expect(combats[1].combatants[0].units.map((unit) => unit.data.id)).to.contain('#U1');
    expect(combats[1].combatants[1].player.units.map((unit) => unit.data.id)).to.contain('#UG1');
    expect(combats[1].combatants[2].player.units.map((unit) => unit.data.id)).to.contain('#UB4');
    expect(combats[1].resolve().map((unit) => unit.data.id)).to.have.members(['#UG1', '#UB4']);
    expect(combats[1].combatants[1].player.units.map((unit) => unit.data.id)).to.not.contain('#UG1');
    expect(combats[1].combatants[2].player.units.map((unit) => unit.data.id)).to.not.contain('#UB4');
    expect(combats[1].location.units.map((unit) => unit.data.id)).to.not.contain(['#UG1', '#UB4']);
    expect(map.units.map((unit) => unit.data.id)).to.not.contain(['#UG1', '#UB4']);
  });
});

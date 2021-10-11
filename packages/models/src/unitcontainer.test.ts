import UnitContainer from './unitcontainer';
import GameMap, { GameMapData } from './map';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';
import combatTestMapData from './test/combatTestMap';

let map: GameMap;
let combatMap: GameMap;

describe('UnitContainer Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
    combatMap = new GameMap(clone(combatTestMapData));
  });

  it('retrieves units from the map', () => {
    for (const territoryId of map.data.territoryIds)
      expect(map.territory(territoryId).units.map((unit) => unit.data.id)).to.have.members(
        map.territory(territoryId).data.unitIds,
        `Territory ${territoryId} has units with correct IDs`
      );
  });

  it('reports has combat', () => {
    expect(combatMap.territory('#T1').hasCombat()).to.be.false;
    expect(combatMap.territory('#T5').hasCombat()).to.be.false;
    expect(combatMap.edge('#E35').hasCombat()).to.be.false;

    expect(combatMap.territory('#T4').hasCombat()).to.be.true;
    expect(combatMap.edge('#E23').hasCombat()).to.be.true;
  });
});

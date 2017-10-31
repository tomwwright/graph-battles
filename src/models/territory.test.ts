import Territory from 'models/territory';
import GameMap, { GameMapData } from 'models/map';
import { TerritoryProperty, TerritoryType, TerritoryAction } from 'models/values';
import { clone } from "models/utils";
import { expect } from 'chai';
import { describe, it, beforeEach } from "mocha";

import testMapData from "test/testMap";

let map: GameMap;

describe('Territory Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
  });

  it('territory objects in the test map', () => {
    expect(map.territories.map(territory => territory.data.id)).to.have.members(map.data.territoryIds);
  });

  it('getters', () => {
    for (const territoryId of map.data.territoryIds) {
      const territory = map.territory(territoryId);

      if (territory.data.playerId)
        expect(territory.player.data.id).to.be.equal(territory.data.playerId, `Territory ${territory.data.id}: player getter`);
      else
        expect(territory.player).to.be.null;

      expect(territory.edges.map(edge => edge.data.id)).to.have.members(territory.data.edgeIds);
    }

    expect(map.territory("#T1").foodProduction).to.be.equal(2, "Territory #T1 foodProduction");
    expect(map.territory("#T2").foodProduction).to.be.equal(1, "Territory #T2 foodProduction");
    expect(map.territory("#T3").foodProduction).to.be.equal(1, "Territory #T3 foodProduction");
    expect(map.territory("#T4").foodProduction).to.be.equal(1, "Territory #T4 foodProduction");
    expect(map.territory("#T5").foodProduction).to.be.equal(2, "Territory #T5 foodProduction");

    expect(map.territory("#T1").maxFood).to.be.equal(10, "Territory #T1 maxFood");
    expect(map.territory("#T2").maxFood).to.be.equal(3, "Territory #T2 maxFood");
    expect(map.territory("#T3").maxFood).to.be.equal(3, "Territory #T3 maxFood");
    expect(map.territory("#T4").maxFood).to.be.equal(5, "Territory #T4 maxFood");
    expect(map.territory("#T5").maxFood).to.be.equal(5, "Territory #T5 maxFood");

    expect(map.territory("#T1").goldProduction).to.be.equal(2, "Territory #T1 goldProduction");
    expect(map.territory("#T2").goldProduction).to.be.equal(0, "Territory #T2 goldProduction");
    expect(map.territory("#T3").goldProduction).to.be.equal(0, "Territory #T3 goldProduction");
    expect(map.territory("#T4").goldProduction).to.be.equal(2, "Territory #T4 goldProduction");
    expect(map.territory("#T5").goldProduction).to.be.equal(1, "Territory #T5 goldProduction");

    expect(map.territory("#T1").type).to.be.equal(TerritoryType.CASTLE_FARM, "Territory #T1 type");
    expect(map.territory("#T2").type).to.be.equal(TerritoryType.UNSETTLED, "Territory #T2 type");
    expect(map.territory("#T3").type).to.be.equal(TerritoryType.UNSETTLED, "Territory #T3 type");
    expect(map.territory("#T4").type).to.be.equal(TerritoryType.CITY, "Territory #T4 type");
    expect(map.territory("#T5").type).to.be.equal(TerritoryType.FARM, "Territory #T5 type");

  });

  it('territory properties', () => {
    const territory = map.territory("#T4");

    expect(territory.hasProperty(TerritoryProperty.SETTLED)).to.be.true;
    expect(territory.hasProperty(TerritoryProperty.SETTLED, TerritoryProperty.CITY)).to.be.true;
    expect(territory.hasProperty(TerritoryProperty.SETTLED, TerritoryProperty.FARM)).to.be.false;

    expect(territory.data.properties).to.have.members([TerritoryProperty.SETTLED, TerritoryProperty.CITY], 'starting territory properties');
    territory.addProperty(TerritoryProperty.SETTLED);
    expect(territory.data.properties).to.have.members([TerritoryProperty.SETTLED, TerritoryProperty.CITY], 'add existing settled property: no change');
    territory.removeProperty(TerritoryProperty.FARM);
    expect(territory.data.properties).to.have.members([TerritoryProperty.SETTLED, TerritoryProperty.CITY], 'remove non-existing farm property: no change');
    territory.addProperty(TerritoryProperty.FARM);
    expect(territory.data.properties).to.have.members([TerritoryProperty.SETTLED, TerritoryProperty.CITY, TerritoryProperty.FARM], 'add farm property: farm added');
    territory.removeProperty(TerritoryProperty.CITY);
    expect(territory.data.properties).to.have.members([TerritoryProperty.SETTLED, TerritoryProperty.FARM], 'remove city property: city removed');
  });

  it('set territory action', () => {
    let territory = map.territory('#T5');

    expect(territory.data.currentAction).to.equal(null, 'territory action is initially no action');
    expect(territory.setTerritoryAction.bind(territory, TerritoryAction.BUILD_SETTLEMENT), 'set to unavailable action').to.throw();
    territory.setTerritoryAction(TerritoryAction.BUILD_CITY);
    expect(territory.data.currentAction).to.equal(TerritoryAction.BUILD_CITY, 'set to valid action: build city');
    expect(territory.player.data.gold).to.equal(10 - 5, 'player gold after setting build city');
    expect(territory.data.food).to.equal(5 - 2, 'territory food after setting build city');
    territory.setTerritoryAction(null);
    expect(territory.data.currentAction).to.equal(null, 'set to no action');
    expect(territory.player.data.gold).to.equal(10, 'player gold after setting no action');
    expect(territory.data.food).to.equal(5, 'territory food after setting no action');
  });

});



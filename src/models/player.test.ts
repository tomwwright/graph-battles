import Player from 'models/player';
import GameMap, { GameMapData } from 'models/map';
import { clone } from "models/utils";
import { expect } from 'chai';
import { describe, it, beforeEach } from "mocha";

import testMapData from "models/test/testMap";

let map: GameMap;

describe('Player Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
  });

  it('player objects in the test map', () => {
    expect(map.players.map(player => player.data.id)).to.have.members(["#PR", "#PB", "#PG"]);
  });

  it('retrieves territories from the map', () => {
    expect(map.player("#PR").territories).to.have.lengthOf(1, "red player has correct number territories");
    expect(map.player("#PR").territories.map(territory => territory.data.id)).to.have.members(["#T2"], "red player has territories with correct IDs");

    expect(map.player("#PB").territories).to.have.lengthOf(2, "blue player has correct number territories");
    expect(map.player("#PB").territories.map(territory => territory.data.id)).to.have.members(["#T1", "#T3"], "blue player has territories with correct IDs");

    expect(map.player("#PG").territories).to.have.lengthOf(1, "green player has correct number territories");
    expect(map.player("#PG").territories.map(territory => territory.data.id)).to.have.members(["#T5"], "green player has territories with correct IDs");

  });

  it('calculates victory points', () => {
    expect(map.player("#PR").victoryPoints).to.equal(5 + 4 + 1 + 0 + 1 + 2 * 0 + 1, 'red player has correct victory points');
    expect(map.player("#PB").victoryPoints).to.equal(1 + 4 + 2 + 5 + 1 + 2 * 2 + 3, 'blue player has correct victory points');
    expect(map.player("#PG").victoryPoints).to.equal(10 + 1 + 1 + 2 + 0 + 2 * 0 + 0, 'green player has correct victory points');
  });
});



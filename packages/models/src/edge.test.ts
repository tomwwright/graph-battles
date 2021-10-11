import Edge from './edge';
import GameMap, { GameMapData } from './map';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';

let map: GameMap;

describe('Edge Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
  });

  it('edge objects in the test map', () => {
    expect(map.edges.map((edge) => edge.data.id)).to.have.members(map.data.edgeIds);
  });

  it('retrieves other territory from the map', () => {
    for (const edgeId of map.data.edgeIds) {
      const edge = map.edge(edgeId);
      expect(edge.other(edge.territoryA).data.id).to.be.equal(edge.data.territoryBId, `Edge ${edgeId}: other(A) == B`);
      expect(edge.other(edge.territoryB).data.id).to.be.equal(edge.data.territoryAId, `Edge ${edgeId}: other(B) == A`);
    }
  });
});

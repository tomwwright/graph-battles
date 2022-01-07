import { Edge } from './edge';
import { GameMap, GameMapData } from './map';
import { clone } from './utils';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

import testMapData from './test/testMap';

let map: GameMap;

describe('Edge Model', () => {
  beforeEach(() => {
    map = new GameMap(clone(testMapData));
  });

  it('retrieves other territory from the map', () => {
    for (const edge of map.edges) {
      expect(edge.other(edge.territoryA).data.id).to.be.equal(
        edge.data.territoryBId,
        `Edge ${edge.data.id}: other(A) == B`
      );
      expect(edge.other(edge.territoryB).data.id).to.be.equal(
        edge.data.territoryAId,
        `Edge ${edge.data.id}: other(B) == A`
      );
    }
  });
});

import { Game, Values } from '@battles/models';
import type { GameData, GameMapData } from '@battles/models';
import type { GameProvider } from './GameProvider';
import type { RenderMap } from '../map/MapParser';

/**
 * Creates a stub GameData from a RenderMap.
 * Assigns players to alternating territories and places one unit on the first territory.
 */
function createStubGameData(renderMap: RenderMap): GameData {
  const dataMap: Record<string, any> = {};

  // Two players
  dataMap['p1'] = {
    id: 'p1',
    type: 'player',
    colour: Values.Colour.RED,
    gold: 5,
    goldProduction: 1,
  };
  dataMap['p2'] = {
    id: 'p2',
    type: 'player',
    colour: Values.Colour.BLUE,
    gold: 5,
    goldProduction: 1,
  };

  // Territories — alternate ownership between players
  let edgeNextId = 1;
  const edgeIds: Record<string, string[]> = {};

  for (const t of renderMap.territories) {
    edgeIds[t.id] = [];
  }

  // Create edges
  for (const e of renderMap.edges) {
    const edgeId = `e${edgeNextId++}`;
    edgeIds[e.territoryA]?.push(edgeId);
    edgeIds[e.territoryB]?.push(edgeId);
    dataMap[edgeId] = {
      id: edgeId,
      type: 'edge',
      territoryAId: e.territoryA,
      territoryBId: e.territoryB,
    };
  }

  // Create territories
  for (let i = 0; i < renderMap.territories.length; i++) {
    const t = renderMap.territories[i];
    const playerId = i % 2 === 0 ? 'p1' : 'p2';
    dataMap[t.id] = {
      id: t.id,
      type: 'territory',
      edgeIds: edgeIds[t.id] ?? [],
      playerId,
      food: 3,
      properties: [Values.TerritoryProperty.SETTLED],
    };
  }

  // One unit on the first territory
  if (renderMap.territories.length > 0) {
    dataMap['u1'] = {
      id: 'u1',
      type: 'unit',
      playerId: 'p1',
      locationId: renderMap.territories[0].id,
      statuses: [],
    };
  }

  const mapData: GameMapData = {
    id: 'map0',
    type: 'map',
    nextId: 100,
    pendingActions: [],
    dataMap,
  };

  return {
    id: 'stub-game',
    maxTurns: 20,
    maxVictoryPoints: 30,
    maps: [mapData],
    users: [
      { id: 'user-1', type: 'user', name: 'Player 1', playerIds: ['p1'] },
      { id: 'user-2', type: 'user', name: 'Player 2', playerIds: ['p2'] },
    ],
  };
}

export function createStubProvider(renderMap: RenderMap): GameProvider {
  const gameData = createStubGameData(renderMap);

  return {
    async get() {
      return new Game(gameData);
    },
    async action(action) {
      console.warn('[StubGameProvider] action() called — no-op in stub mode', action);
      return new Game(gameData);
    },
    async create() {
      console.warn('[StubGameProvider] create() called — returning default stub game');
      return new Game(gameData);
    },
  };
}

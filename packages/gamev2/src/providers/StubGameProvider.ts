import { Game, GameMap, Values } from '@battles/models';
import type { GameData, GameMapData } from '@battles/models';
import type { GameProvider } from './GameProvider';
import type { HexCellMap } from '../map/HexCellMap';

/**
 * Hard-coded fallback map used when the page is loaded with no `gameId` in the
 * URL (dev / demo mode). Inlined as a string so the stub provider has no
 * external asset dependency.
 */
export const STUB_MAP_TEXT = [
  '|     |     |     | E -1 | E -2|      | T 2 | E -2|',
  '|     | E 36| T 1 |      | T 3 | E -4 |     | E -3|',
  '|E 25 |     | E -1| E -4 |     | T  4 | E -4|     |',
  '|E 13 | T 5 |     |T 6   | E -4|      |     |     |',
  '|     | E -5| E -4|      |     |      |     |     |',
].join('\n');

/**
 * Creates a stub GameData from a HexCellMap.
 * Assigns players to alternating territories and places one unit on the first territory.
 */
function createStubGameData(map: HexCellMap): GameData {
  const dataMap: Record<string, any> = {};

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

  const territories = map.territories();
  const edges = map.edges();
  const edgeIds: Record<string, string[]> = {};
  for (const t of territories) edgeIds[t.id] = [];

  for (const e of edges) {
    edgeIds[e.territoryA]?.push(e.id);
    edgeIds[e.territoryB]?.push(e.id);
    dataMap[e.id] = {
      id: e.id,
      type: 'edge',
      territoryAId: e.territoryA,
      territoryBId: e.territoryB,
    };
  }

  for (let i = 0; i < territories.length; i++) {
    const t = territories[i];
    const playerId = i % 2 === 0 ? 'p1' : 'p2';
    dataMap[t.id] = {
      id: t.id,
      type: 'territory',
      edgeIds: edgeIds[t.id] ?? [],
      playerId,
      food: 3,
      properties: [Values.TerritoryProperty.SETTLED, Values.TerritoryProperty.CITY],
    };
  }

  if (territories.length > 0) {
    dataMap['u1'] = {
      id: 'u1',
      type: 'unit',
      playerId: 'p1',
      locationId: territories[0].id,
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

export function createStubProvider(map: HexCellMap): GameProvider {
  let gameData = createStubGameData(map);

  return {
    async get() {
      return new Game(gameData);
    },
    async action(_playerId, action) {
      // Mirror LocalGameProvider: apply action to in-memory game, resolve the
      // turn synchronously when all players are ready. Lets stub mode exercise
      // the full turn-flow loop without persistence or a backend.
      const game = new Game(gameData);
      const map = new GameMap(game.latestMap);
      map.applyAction(action);
      if (action.type === 'ready-player' && map.players.every((p) => p.ready)) {
        game.resolveTurn();
      }
      gameData = game.data;
      return game;
    },
    async getMapText() {
      return STUB_MAP_TEXT;
    },
    async waitForTurn(currentTurn: number, _signal?: AbortSignal): Promise<Game> {
      void _signal;
      const game = new Game(gameData);
      if (game.turn > currentTurn) return game;
      throw new Error(`StubGameProvider: turn ${currentTurn} not yet resolved`);
    },
  };
}

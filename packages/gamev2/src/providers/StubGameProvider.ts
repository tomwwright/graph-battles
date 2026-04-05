import { Game, Values } from '@battles/models';
import type { GameData, GameMapData } from '@battles/models';
import type { GameProvider } from './GameProvider';

function createStubGameData(): GameData {
  const mapData: GameMapData = {
    id: '#0',
    type: 'map',
    nextId: 10,
    pendingActions: [],
    dataMap: {
      '#1': {
        id: '#1',
        type: 'player',
        colour: Values.Colour.RED,
        gold: 5,
        goldProduction: 1,
      },
      '#2': {
        id: '#2',
        type: 'player',
        colour: Values.Colour.BLUE,
        gold: 5,
        goldProduction: 1,
      },
      '#3': {
        id: '#3',
        type: 'territory',
        edgeIds: ['#6', '#7'],
        playerId: '#1',
        food: 3,
        properties: [Values.TerritoryProperty.SETTLED],
      },
      '#4': {
        id: '#4',
        type: 'territory',
        edgeIds: ['#6', '#8'],
        playerId: '#2',
        food: 3,
        properties: [Values.TerritoryProperty.SETTLED],
      },
      '#5': {
        id: '#5',
        type: 'territory',
        edgeIds: ['#7', '#8'],
        playerId: '',
        food: 0,
        properties: [],
      },
      '#6': { id: '#6', type: 'edge', territoryAId: '#3', territoryBId: '#4' },
      '#7': { id: '#7', type: 'edge', territoryAId: '#3', territoryBId: '#5' },
      '#8': { id: '#8', type: 'edge', territoryAId: '#4', territoryBId: '#5' },
      '#9': {
        id: '#9',
        type: 'unit',
        playerId: '#1',
        locationId: '#3',
        statuses: [],
      },
    },
  };

  return {
    id: 'stub-game',
    maxTurns: 20,
    maxVictoryPoints: 30,
    maps: [mapData],
    users: [
      { id: 'user-1', type: 'user', name: 'Player 1', playerIds: ['#1'] },
      { id: 'user-2', type: 'user', name: 'Player 2', playerIds: ['#2'] },
    ],
  };
}

export const stubProvider: GameProvider = {
  async get() {
    return new Game(createStubGameData());
  },
  async action(action) {
    console.warn('[StubGameProvider] action() called — no-op in stub mode', action);
    return new Game(createStubGameData());
  },
  async create() {
    console.warn('[StubGameProvider] create() called — returning default stub game');
    return new Game(createStubGameData());
  },
};

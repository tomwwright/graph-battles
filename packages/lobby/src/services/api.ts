import { GameData } from '@battles/models';
import { VersionedViewData } from '../types';

export type GameSummary = {
  gameId: string;
  turn: number;
  maxTurns: number;
  maxVictoryPoints: number;
  numTerritories: number;
  finished: boolean;
  leaderboard: {
    name: string;
    victoryPoints: number;
  }[];
  updatedAt: number;
};

const BATTLES_API_HOSTNAME = 'https://dctg63fuac.execute-api.ap-southeast-2.amazonaws.com';

export async function createGame(gameData: GameData, viewData: VersionedViewData): Promise<void> {
  const gameResponse = await fetch(`${BATTLES_API_HOSTNAME}/game`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gameData),
  });
  if (!gameResponse.ok) throw new Error(`Failed to create game: ${gameResponse.status}`);

  const viewResponse = await fetch(`${BATTLES_API_HOSTNAME}/game/${gameData.id}/view`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(viewData),
  });
  if (!viewResponse.ok) throw new Error(`Failed to create view: ${viewResponse.status}`);
}

export async function listGames(): Promise<GameSummary[]> {
  const response = await fetch(`${BATTLES_API_HOSTNAME}/game/_all`);
  return response.json() as Promise<GameSummary[]>;
}

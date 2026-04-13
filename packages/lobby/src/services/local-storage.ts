import { GameData, Utils } from '@battles/models';
import { ViewData } from '../types';

const KEY_PREFIX = 'graph-battles-';
const KEY_GAME_LIST = KEY_PREFIX + 'gamelist';

export type SavedGame = {
  gameData: GameData;
  viewData: ViewData;
  lastUpdated: number;
};

export function saveGame(savedGame: SavedGame): void {
  let gameList: string[] = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');
  gameList = Utils.include(gameList, savedGame.gameData.id);
  window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));
  window.localStorage.setItem(KEY_PREFIX + savedGame.gameData.id, JSON.stringify(savedGame));
}

export function loadGame(name: string): SavedGame {
  const gameJson = window.localStorage.getItem(KEY_PREFIX + name);
  if (!gameJson) throw new Error("Game '" + name + "' not stored in LocalStorage!");
  return JSON.parse(gameJson) as SavedGame;
}

export function deleteGame(name: string): void {
  let gameList: string[] = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');
  gameList = Utils.exclude(gameList, name);
  window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));
  window.localStorage.removeItem(KEY_PREFIX + name);
}

export function listGames(): SavedGame[] {
  const gameList: string[] = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');
  return gameList.map((gameName) => loadGame(gameName));
}

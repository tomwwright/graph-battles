import { GameProvider } from 'game/providers/base';
import { ViewData } from 'game/stores/phaser';
import { Actions, Game, GameData, GameMap, Utils } from '@battles/models';

const KEY_PREFIX: string = 'graph-battles-';
const KEY_GAME_LIST: string = KEY_PREFIX + 'gamelist';

export class LocalGameProvider extends GameProvider {
  private constructor(gameId: string, userId: string) {
    super(gameId, userId);
  }

  public async get(): Promise<Game> {
    const savedGame = await LocalStorage.loadGame(this.gameId);
    return new Game(savedGame.gameData);
  }

  public async action(action: Actions.ModelAction) {
    const savedGame = await LocalStorage.loadGame(this.gameId);
    const game = new Game(savedGame.gameData);
    const map = new GameMap(game.latestMap);
    map.applyAction(action);
    // until actions are stored in the map this will be broken as ready has been removed from the player data
    // if (action.type === 'ready-player' && map.players.every((player) => player.data.ready)) {
    //   game.resolveTurn();
    // }
    savedGame.gameData = game.data;
    savedGame.lastUpdated = Date.now();
    LocalStorage.saveGame(savedGame);
    return game;
  }

  public async wait(condition: (game: Game) => boolean): Promise<Game> {
    let game;
    do {
      game = await LocalStorage.listen(this.gameId);
    } while (!condition(game));
    return game;
  }

  public static createProvider(gameId: string, userId: string): LocalGameProvider {
    return new LocalGameProvider(gameId, userId);
  }
}

export type SavedGame = {
  gameData: GameData;
  viewData: ViewData;
  lastUpdated: number;
};

export class LocalStorage {
  static saveGame(savedGame: SavedGame): void {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    // retrieve game list and modify
    let gameList = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');
    gameList = Utils.include(gameList, savedGame.gameData.id);
    window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));

    // save game data
    window.localStorage.setItem(KEY_PREFIX + savedGame.gameData.id, JSON.stringify(savedGame));
  }

  static loadGame(name: string): SavedGame {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    // retrieve stringified SavedGame json
    let gameJson = window.localStorage.getItem(KEY_PREFIX + name);
    if (!gameJson) throw new Error("Game '" + name + "' not stored in LocalStorage!");

    return JSON.parse(gameJson) as SavedGame;
  }

  static listen(name: string): Promise<SavedGame> {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    return new Promise<SavedGame>((resolve, reject) => {
      let storageListener = (e: StorageEvent) => {
        if (e.key === KEY_PREFIX + name) {
          window.removeEventListener('storage', storageListener);
          resolve(<SavedGame>JSON.parse(e.newValue));
        }
      };

      window.addEventListener('storage', storageListener);
    });
  }

  static deleteGame(name: string): void {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    // retrieve game list and modify
    let gameList = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');
    gameList = Utils.exclude(gameList, name);
    window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));

    // remove game data
    window.localStorage.removeItem(KEY_PREFIX + name);
  }

  static listGames(): SavedGame[] {
    if (!window) throw new Error('LocalStorage only available in the browser!');
    if (!window.localStorage) throw new Error('LocalStorage not available!');

    // retrieve game list
    let gameList: string[] = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || '[]');

    let games: SavedGame[] = gameList.map((gameName) => LocalStorage.loadGame(gameName));

    return games;
  }
}

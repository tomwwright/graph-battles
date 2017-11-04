import GameProvider from "game/providers/base";
import { include, exclude } from "models/utils";
import { ModelAction } from "models/actions";
import Game, { GameData } from "models/game";
import GameMap from "models/map";

const KEY_PREFIX: string = "graph-battles-";
const KEY_GAME_LIST: string = KEY_PREFIX + "gamelist";

export default class LocalGameProvider extends GameProvider {
  private constructor(gameId: string, userId: string) {
    super(gameId, userId);
  }

  public async get(): Promise<Game> {
    return await LocalStorage.loadGame(this.gameId);
  }

  public async action(action: ModelAction) {
    const game = await this.get();
    const map = new GameMap(game.latestMap);
    map.applyAction(action);
    if (action.type === "ready-player" && map.players.every(player => player.data.ready)) {
      /* TODO bit of a hacky way to handle turn resolution here... */
      //game.resolveTurn();
    }
    LocalStorage.saveGame(game);
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

export class LocalStorage {
  static saveGame(game: Game): void {
    if (!window) throw new Error("LocalStorage only available in the browser!");
    if (!window.localStorage) throw new Error("LocalStorage not available!");

    // retrieve game list and modify
    let gameList = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || "[]");
    gameList = include(gameList, game.data.id);
    window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));

    // save game data
    window.localStorage.setItem(KEY_PREFIX + game.data.id, JSON.stringify(game.data));
  }

  static loadGame(name: string): Game {
    if (!window) throw new Error("LocalStorage only available in the browser!");
    if (!window.localStorage) throw new Error("LocalStorage not available!");

    // retrieve stringified Game json
    let gameJson = window.localStorage.getItem(KEY_PREFIX + name);
    if (!gameJson) throw new Error("Game '" + name + "' not stored in LocalStorage!");

    // convert to object
    let game: Game = new Game(<GameData>JSON.parse(gameJson));
    if (!game) throw new Error("Invalid data stored under '" + name + "' in LocalStorage!");

    return game;
  }

  static listen(name: string): Promise<Game> {
    if (!window) throw new Error("LocalStorage only available in the browser!");
    if (!window.localStorage) throw new Error("LocalStorage not available!");

    return new Promise<Game>((resolve, reject) => {
      let storageListener = (e: StorageEvent) => {
        if (e.key === KEY_PREFIX + name) {
          window.removeEventListener("storage", storageListener);
          resolve(new Game(<GameData>JSON.parse(e.newValue)));
        }
      };

      window.addEventListener("storage", storageListener);
    });
  }

  static deleteGame(name: string): void {
    if (!window) throw new Error("LocalStorage only available in the browser!");
    if (!window.localStorage) throw new Error("LocalStorage not available!");

    // retrieve game list and modify
    let gameList = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || "[]");
    gameList = exclude(gameList, name);
    window.localStorage.setItem(KEY_GAME_LIST, JSON.stringify(gameList));

    // remove game data
    window.localStorage.removeItem(KEY_PREFIX + name);
  }

  static listGames(): Game[] {
    if (!window) throw new Error("LocalStorage only available in the browser!");
    if (!window.localStorage) throw new Error("LocalStorage not available!");

    // retrieve game list and modify
    let gameList: string[] = JSON.parse(window.localStorage.getItem(KEY_GAME_LIST) || "[]");

    let games: Game[] = gameList.map(gameName => LocalStorage.loadGame(gameName));

    return games;
  }
}

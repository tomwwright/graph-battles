import GameProvider from "game/providers/base";
import { include, exclude } from "models/utils";
import { ModelAction } from "models/actions";
import Game, { GameData } from "models/game";

const KEY_PREFIX: string = "phaser-tactics-";
const KEY_GAME_LIST: string = KEY_PREFIX + "gamelist";

export class LocalGameProvider extends GameProvider {
  private constructor(gameId: string, userId: string) {
    super(gameId, userId);
  }

  public get(): Promise<Game> {
    return new Promise<Game>((resolve, reject) => {
      resolve(LocalStorage.loadGame(this.gameId));
    });
  }

  public action(action: ModelAction) {
    return new Promise<Game>((resolve, reject) => {
      this.get()
        .then(game => {
          game.latestMap.applyAction(action);
          if (action.type === "ready-player" && game.latestMap.players.every(player => player.data.ready)) {
            /* TODO bit of a hacky way to handle turn resolution here... */
            game.resolveTurn();
          }
          LocalStorage.saveGame(game);
          resolve(game);
        })
        .catch(error => reject(error));
    });
  }

  public wait(condition: (game: Game) => boolean): Promise<Game> {
    let self = this;
    return new Promise<Game>((resolve, reject) => {
      let check = (game: Game) => {
        if (condition(game)) resolve(game);
        else LocalStorage.listen(this.gameId).then(check);
      };
      // check the state of the game now, just check if it's actually already ready
      setTimeout(() => {
        self.get().then(check);
      }, 2000);
    });
  }

  public static createProvider(gameId: string, userId: string): LocalGameProvider {
    return new LocalGameProvider(gameId, userId);
  }
}

class LocalStorage {
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

import { GameProvider } from "game/providers/base";
import Game, { GameData } from "models/game";
import GameMap from "models/map";
import { ModelAction } from "models/actions";

const KEY_PREFIX: string = "graph-battles-";
const KEY_GAME_LIST: string = KEY_PREFIX + "gamelist";

export class MockGameProvider extends GameProvider {
  private game: Game;

  private constructor(gameId: string, userId: string) {
    super(gameId, userId);
  }

  public async get(): Promise<Game> {
    return this.game;
  }

  public async action(action: ModelAction) {
    const map = new GameMap(this.game.latestMap);
    map.applyAction(action);
    if (action.type === "ready-player" && map.players.every(player => player.data.ready)) {
      this.game.resolveTurn();
    }
    return this.game;
  }

  public async wait(condition: (game: Game) => boolean): Promise<Game> {
    return this.game;
  }

  public static createProvider(gameId: string, userId: string, game: Game): MockGameProvider {
    const provider = new MockGameProvider(gameId, userId);
    provider.game = game;
    return provider;
  }
}
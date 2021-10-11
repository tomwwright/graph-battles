import Game from "models/game";
import { ModelAction } from "models/actions";

export abstract class GameProvider {
  protected gameId: string;
  protected userId: string;

  constructor(gameId: string, userId: string) {
    this.gameId = gameId;
    this.userId = userId;
  }

  public abstract get(): Promise<Game>;

  public abstract action(action: ModelAction): Promise<Game>;

  public abstract wait(condition: (game: Game) => boolean): Promise<Game>;
}

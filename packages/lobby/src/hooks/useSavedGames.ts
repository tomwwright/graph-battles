import { useState, useCallback } from 'react';
import * as LocalStorage from '../services/local-storage';
import type { SavedGame } from '../services/local-storage';

export type { SavedGame };

export function useSavedGames() {
  const [games, setGames] = useState<SavedGame[]>(() =>
    LocalStorage.listGames().sort((a, b) => b.lastUpdated - a.lastUpdated)
  );

  const reload = useCallback(() => {
    setGames(LocalStorage.listGames().sort((a, b) => b.lastUpdated - a.lastUpdated));
  }, []);

  const save = useCallback(
    (game: SavedGame) => {
      game.lastUpdated = Date.now();
      LocalStorage.saveGame(game);
      reload();
    },
    [reload]
  );

  const deleteGame = useCallback(
    (gameId: string) => {
      LocalStorage.deleteGame(gameId);
      reload();
    },
    [reload]
  );

  return { games, save, deleteGame, reload };
}

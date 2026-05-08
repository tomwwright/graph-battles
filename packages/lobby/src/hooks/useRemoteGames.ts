import { useState, useEffect, useCallback } from 'react';
import { GameApiClient, type GameSummary } from '@battles/api/client';

export type { GameSummary };

const api = new GameApiClient();

export function useRemoteGames() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await api.listGames();
      setGames(summaries.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { games, loading, error, reload: load };
}

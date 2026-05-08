import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseMap, RenderMap } from '../map/MapParser';
import { validateRenderMap } from '../map/validateRenderMap';
import {
  APIGameProvider,
  LocalGameProvider,
  STUB_MAP_TEXT,
  createStubProvider,
  type GameProvider,
} from '../providers';
import { AssetLoader } from '../rendering';

/**
 * Resolved per-session context shared across the gamev2 React tree:
 * URL identity (gameId/userId/isLocal), the configured GameProvider,
 * the AssetLoader, and the parsed RenderMap derived from the provider's
 * map text.
 *
 * For the no-`gameId` dev path, a stub provider is used and `gameId` /
 * `userId` are undefined.
 */
export type GameSession = {
  gameId: string | undefined;
  userId: string | undefined;
  isLocal: boolean;
  baseUrl: string;
  provider: GameProvider;
  assetLoader: AssetLoader;
  renderMap: RenderMap;
};

const GameSessionContext = createContext<GameSession | null>(null);

export function useGameSession(): GameSession {
  const session = useContext(GameSessionContext);
  if (!session) throw new Error('useGameSession must be used within a GameSessionProvider');
  return session;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; session: GameSession }
  | { kind: 'error'; message: string };

type GameSessionProviderProps = {
  children: ReactNode;
};

/**
 * Reads URL params, constructs the right GameProvider, parses the map,
 * and provides the resulting GameSession via context. Renders an inline
 * error UI on load failure (e.g. a v1 game opened in v2).
 */
export function GameSessionProvider({ children }: GameSessionProviderProps) {
  const sessionRef = useRef<GameSession | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (sessionRef.current) {
      setState({ kind: 'loaded', session: sessionRef.current });
      return;
    }

    const baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    const assetLoader = new AssetLoader(baseUrl);

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gameId') ?? undefined;
    const userId = params.get('userId') ?? undefined;
    const isLocal = params.get('local') === 'true';

    (async () => {
      try {
        let provider: GameProvider;

        if (!gameId) {
          // Dev fallback — parse stub map text and build an in-memory game.
          const renderMap = parseMap(STUB_MAP_TEXT);
          provider = createStubProvider(renderMap);
          const game = await provider.get();
          validateRenderMap(renderMap, game.data.maps[0]);
          sessionRef.current = {
            gameId: undefined,
            userId: undefined,
            isLocal: false,
            baseUrl,
            provider,
            assetLoader,
            renderMap,
          };
          setState({ kind: 'loaded', session: sessionRef.current });
          return;
        }

        if (!userId) {
          setState({ kind: 'error', message: 'Missing userId in URL.' });
          return;
        }

        provider = isLocal
          ? new LocalGameProvider(gameId, userId)
          : new APIGameProvider(gameId, userId);

        const mapText = await provider.getMapText();
        const renderMap = parseMap(mapText);
        const game = await provider.get();
        validateRenderMap(renderMap, game.data.maps[0]);
        sessionRef.current = {
          gameId,
          userId,
          isLocal,
          baseUrl,
          provider,
          assetLoader,
          renderMap,
        };
        setState({ kind: 'loaded', session: sessionRef.current });
      } catch (e) {
        const isV1 = e instanceof Error && e.message === 'v1-view-data';
        setState({
          kind: 'error',
          message: isV1
            ? `Game '${gameId}' cannot be opened in gamev2 — its map data is from v1.`
            : `Failed to load game '${gameId}': ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    })();
  }, []);

  if (state.kind === 'loading') return null;
  if (state.kind === 'error') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h2>Cannot load game</h2>
        <p>{state.message}</p>
      </div>
    );
  }
  return <GameSessionContext.Provider value={state.session}>{children}</GameSessionContext.Provider>;
}

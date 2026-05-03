import { useEffect, useRef, useState } from 'react';
import { parseMap, RenderMap } from '../map/MapParser';
import {
  APIGameProvider,
  LocalGameProvider,
  createStubProvider,
  type GameProvider,
} from '../providers';
import { AssetLoader } from '../rendering';

const STUB_MAP_URL = '/maps/small-2p.txt';

type LoadedMap = {
  assetLoader: AssetLoader;
  renderMap: RenderMap;
  provider: GameProvider;
  userId?: string;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; loaded: LoadedMap }
  | { kind: 'error'; message: string };

export function MapLoader({ children }: { children: (loaded: LoadedMap) => React.ReactNode }) {
  const loadedRef = useRef<LoadedMap | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (loadedRef.current) {
      setState({ kind: 'loaded', loaded: loadedRef.current });
      return;
    }

    const baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    const assetLoader = new AssetLoader(baseUrl);

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gameId');
    const userId = params.get('userId') ?? undefined;
    const isLocal = params.get('local') === 'true';

    (async () => {
      try {
        let provider: GameProvider;
        let mapText: string;

        if (!gameId) {
          mapText = await assetLoader.load(STUB_MAP_URL);
          const renderMap = parseMap(mapText);
          provider = createStubProvider(renderMap, mapText);
          loadedRef.current = { assetLoader, renderMap, provider };
          setState({ kind: 'loaded', loaded: loadedRef.current });
          return;
        }

        if (!userId) {
          setState({ kind: 'error', message: 'Missing userId in URL.' });
          return;
        }

        provider = isLocal
          ? new LocalGameProvider(gameId, userId)
          : new APIGameProvider(gameId, userId);

        mapText = await provider.getMapText();
        const renderMap = parseMap(mapText);
        loadedRef.current = { assetLoader, renderMap, provider, userId };
        setState({ kind: 'loaded', loaded: loadedRef.current });
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
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#fff' }}>
        <h2>Cannot load game</h2>
        <p>{state.message}</p>
      </div>
    );
  }
  return <>{children(state.loaded)}</>;
}

import { useEffect, useRef, useState } from 'react';
import { parseMap, RenderMap } from '../map/MapParser';
import { createStubProvider } from '../providers/StubGameProvider';
import { GameProvider } from '../providers/GameProvider';
import { AssetLoader } from '../rendering';

const MAP_URL = '/maps/small-2p.txt';

type LoadedMap = {
  assetLoader: AssetLoader;
  renderMap: RenderMap;
  provider: GameProvider;
};

export function MapLoader({ children }: { children: (loaded: LoadedMap) => React.ReactNode }) {
  const loadedRef = useRef<LoadedMap | null>(null);
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);

  useEffect(() => {
    if (loadedRef.current) {
      setLoaded(loadedRef.current);
      return;
    }

    // determine base url, stripping any ending slash
    const baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '')

    const assetLoader = new AssetLoader(baseUrl);

    assetLoader.load(MAP_URL)
      .then((text) => {
        const renderMap = parseMap(text);
        const provider = createStubProvider(renderMap);
        loadedRef.current = { assetLoader, renderMap, provider };
        setLoaded(loadedRef.current);
      });
  }, []);

  if (!loaded) return null;
  return <>{children(loaded)}</>;
}
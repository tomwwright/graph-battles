import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameContextProvider } from './ui/GameContextProvider';
import { App } from './ui/App';
import { parseMap, RenderMap } from './map/MapParser';
import { createStubProvider } from './providers/StubGameProvider';
import { GameProvider } from './providers/GameProvider';

const MAP_URL = '/maps/small-2p.txt';

type LoadedMap = {
  renderMap: RenderMap;
  provider: GameProvider;
};

function MapLoader({ children }: { children: (loaded: LoadedMap) => React.ReactNode }) {
  const loadedRef = useRef<LoadedMap | null>(null);
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);

  useEffect(() => {
    if (loadedRef.current) {
      setLoaded(loadedRef.current);
      return;
    }

    fetch(MAP_URL)
      .then((r) => r.text())
      .then((text) => {
        const renderMap = parseMap(text);
        const provider = createStubProvider(renderMap);
        loadedRef.current = { renderMap, provider };
        setLoaded(loadedRef.current);
      });
  }, []);

  if (!loaded) return null;
  return <>{children(loaded)}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapLoader>
      {({ renderMap, provider }) => (
        <BabylonJsProvider>
          <GameContextProvider provider={provider} renderMap={renderMap}>
            <App />
          </GameContextProvider>
        </BabylonJsProvider>
      )}
    </MapLoader>
  </StrictMode>
);

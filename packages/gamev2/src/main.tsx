import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameContextProvider } from './ui/GameContextProvider';
import { App } from './ui/App';
import { parseMap, ParsedMap } from './map/MapParser';
import { createStubProvider } from './providers/StubGameProvider';
import { GameProvider } from './providers/GameProvider';

const MAP_URL = '/maps/small-2p.txt';

type LoadedMap = {
  parsedMap: ParsedMap;
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
        const parsedMap = parseMap(text);
        const provider = createStubProvider(parsedMap);
        loadedRef.current = { parsedMap, provider };
        setLoaded(loadedRef.current);
      });
  }, []);

  if (!loaded) return null;
  return <>{children(loaded)}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapLoader>
      {({ parsedMap, provider }) => (
        <BabylonJsProvider>
          <GameContextProvider provider={provider} parsedMap={parsedMap}>
            <App />
          </GameContextProvider>
        </BabylonJsProvider>
      )}
    </MapLoader>
  </StrictMode>
);

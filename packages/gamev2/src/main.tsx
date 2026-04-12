import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameContextProvider } from './ui/GameContextProvider';
import { CursorProvider } from './ui/CursorProvider';
import { App } from './ui/App';
import { MapLoader } from './ui/MapLoader';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapLoader>
      {({ assetLoader, renderMap, provider }) => (
        <CursorProvider>
          <BabylonJsProvider>
            <GameContextProvider assetLoader={assetLoader} provider={provider} renderMap={renderMap}>
              <App />
            </GameContextProvider>
          </BabylonJsProvider>
        </CursorProvider>
      )}
    </MapLoader>
  </StrictMode>
);

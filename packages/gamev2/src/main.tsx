import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameContextProvider } from './ui/GameContextProvider';
import { App } from './ui/App';
import { parseMap } from './map/MapParser';
import { createStubProvider } from './providers/StubGameProvider';

const MAP_STRING = `TgTgT
gTgTg
TgTgT`;

const parsedMap = parseMap(MAP_STRING);
const stubProvider = createStubProvider(parsedMap);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BabylonJsProvider>
      <GameContextProvider provider={stubProvider} parsedMap={parsedMap}>
        <App />
      </GameContextProvider>
    </BabylonJsProvider>
  </StrictMode>
);

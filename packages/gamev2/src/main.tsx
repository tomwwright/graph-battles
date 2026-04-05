import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameContextProvider } from './ui/GameContextProvider';
import { App } from './ui/App';
import { stubProvider } from './providers/StubGameProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BabylonJsProvider>
      <GameContextProvider provider={stubProvider}>
        <App />
      </GameContextProvider>
    </BabylonJsProvider>
  </StrictMode>
);

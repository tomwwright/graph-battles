import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BabylonJsProvider } from './ui/BabylonJsProvider';
import { GameOrchestratorProvider } from './ui/GameOrchestratorProvider';
import { CursorProvider } from './ui/CursorProvider';
import { App } from './ui/App';
import { GameSessionProvider } from './ui/GameSessionProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameSessionProvider>
      <CursorProvider>
        <BabylonJsProvider>
          <GameOrchestratorProvider>
            <App />
          </GameOrchestratorProvider>
        </BabylonJsProvider>
      </CursorProvider>
    </GameSessionProvider>
  </StrictMode>
);

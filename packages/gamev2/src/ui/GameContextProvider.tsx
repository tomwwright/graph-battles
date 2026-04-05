import { createContext, useEffect, useState, type ReactNode } from 'react';
import { GameStore } from '../state/GameStore';
import { UserActionDispatch } from '../state/types';
import { GameOrchestrator } from '../orchestration/GameOrchestrator';
import { GameRenderer } from '../rendering/GameRenderer';
import { GameProvider } from '../providers/GameProvider';
import { useBabylonJs } from './BabylonJsProvider';

export const GameStoreContext = createContext<GameStore | null>(null);
export const UserActionDispatchContext = createContext<UserActionDispatch | null>(null);

type GameContextProviderProps = {
  provider: GameProvider;
  children: ReactNode;
};

/**
 * Creates the orchestrator from BabylonJs context, initialises it,
 * then provides GameStoreContext and UserActionDispatchContext to children.
 */
export function GameContextProvider({ provider, children }: GameContextProviderProps) {
  const { scene, camera } = useBabylonJs();
  const [orchestrator, setOrchestrator] = useState<GameOrchestrator | null>(null);

  useEffect(() => {
    const renderer = new GameRenderer(scene, camera);

    // Create store with a placeholder initial state — orchestrator.initialise() will set the real state
    const store = new GameStore({
      game: null!,
      map: null!,
      currentPlayerId: '',
      turn: 0,
      turnPhase: 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hoveredTerritoryId: null,
      currentResolution: null,
      visibilityMode: 'current-player',
    });

    const orch = new GameOrchestrator(store, renderer, provider);

    orch.initialise().then(() => {
      setOrchestrator(orch);
    });

    return () => {
      renderer.dispose();
    };
  }, [scene, camera, provider]);

  if (!orchestrator) {
    return null; // Loading state — orchestrator not yet initialised
  }

  return (
    <GameStoreContext.Provider value={orchestrator.store}>
      <UserActionDispatchContext.Provider value={orchestrator}>
        {children}
      </UserActionDispatchContext.Provider>
    </GameStoreContext.Provider>
  );
}

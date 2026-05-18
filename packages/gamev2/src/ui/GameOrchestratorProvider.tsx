import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { GameStore } from '../state/GameStore';
import type { Dispatch } from '../state/types';
import { GameOrchestrator } from '../orchestration/GameOrchestrator';
import { GameRenderer } from '../rendering/GameRenderer';
import { useBabylonJs } from './BabylonJsProvider';
import { useGameSession } from './GameSessionProvider';

export const GameStoreContext = createContext<GameStore | null>(null);
export const DispatchContext = createContext<Dispatch | null>(null);

type GameOrchestratorProviderProps = {
  children: ReactNode;
};

/**
 * Creates the orchestrator from BabylonJs context + GameSession, initialises it,
 * then provides GameStoreContext and DispatchContext to children.
 * Uses a ref to ensure only one orchestrator is created even under StrictMode double-mount.
 */
export function GameOrchestratorProvider({ children }: GameOrchestratorProviderProps) {
  const { scene, camera } = useBabylonJs();
  const { provider, renderMap, assetLoader, userId } = useGameSession();
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const [orchestrator, setOrchestrator] = useState<GameOrchestrator | null>(null);

  useEffect(() => {
    if (orchestratorRef.current == null) {
      const renderer = new GameRenderer(scene, camera as ArcRotateCamera, assetLoader);

      const store = new GameStore({
        game: null!,
        map: null!,
        mapRevision: 0,
        turn: 0,
        phase: { type: 'next-player', currentPlayerId: '' },
        selectedUnitIds: [],
        selectedTerritoryId: null,
        hover: null,
        currentResolution: null,
        autoResolve: false,
        visibilityMode: 'current-player',
        pendingAnimations: [],
      });

      const orch = new GameOrchestrator(store, renderer, provider, userId);
      orchestratorRef.current = orch;
      initPromiseRef.current = orch.initialise(renderMap);
    }

    // Both mount runs await the same in-flight init before publishing the
    // orchestrator — otherwise StrictMode's second mount sees the existing ref
    // and would publish before init resolves, leaving children with a null
    // store.game.
    initPromiseRef.current!.then(() => {
      setOrchestrator(orchestratorRef.current);
    });

    // Don't dispose on cleanup — StrictMode remounts effects in dev
  }, [scene, camera, provider, renderMap, userId, assetLoader]);

  if (!orchestrator) {
    return null;
  }

  return (
    <GameStoreContext.Provider value={orchestrator.store}>
      <DispatchContext.Provider value={orchestrator.dispatch}>
        {children}
      </DispatchContext.Provider>
    </GameStoreContext.Provider>
  );
}

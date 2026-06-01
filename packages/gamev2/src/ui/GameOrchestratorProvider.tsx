import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { GameStore } from '../state/GameStore';
import type { Dispatch } from '../state/types';
import { GameOrchestrator } from '../orchestration/GameOrchestrator';
import { GameRenderer } from '../rendering/GameRenderer';
import { useBabylonJs } from './BabylonJsProvider';
import { useGameSession } from './GameSessionProvider';

type GameOrchestratorContextValue = {
  store: GameStore;
  dispatch: Dispatch;
  renderer: GameRenderer;
};

export const GameOrchestratorContext = createContext<GameOrchestratorContextValue | null>(null);

export function useGameOrchestrator(): GameOrchestratorContextValue {
  const ctx = useContext(GameOrchestratorContext);
  if (!ctx) throw new Error('useGameOrchestrator must be used within GameOrchestratorProvider');
  return ctx;
}

export function useGameRenderer(): GameRenderer {
  return useGameOrchestrator().renderer;
}

type GameOrchestratorProviderProps = {
  children: ReactNode;
};

/**
 * Creates the orchestrator from BabylonJs context + GameSession, initialises it,
 * then provides a single GameOrchestratorContext to children.
 * Uses a ref to ensure only one orchestrator is created even under StrictMode double-mount.
 */
export function GameOrchestratorProvider({ children }: GameOrchestratorProviderProps) {
  const { scene, camera } = useBabylonJs();
  const { provider, renderMap, assetLoader, userId } = useGameSession();
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const ctxValueRef = useRef<GameOrchestratorContextValue | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const [ctxValue, setCtxValue] = useState<GameOrchestratorContextValue | null>(null);

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
      ctxValueRef.current = { store, dispatch: orch.dispatch, renderer };
      initPromiseRef.current = orch.initialise(renderMap);
    }

    // Both mount runs await the same in-flight init before publishing the
    // context — otherwise StrictMode's second mount sees the existing ref
    // and would publish before init resolves, leaving children with a null store.
    initPromiseRef.current!.then(() => {
      setCtxValue(ctxValueRef.current);
    });

    // Don't dispose on cleanup — StrictMode remounts effects in dev
  }, [scene, camera, provider, renderMap, userId, assetLoader]);

  if (!ctxValue) return null;

  return (
    <GameOrchestratorContext.Provider value={ctxValue}>
      {children}
    </GameOrchestratorContext.Provider>
  );
}

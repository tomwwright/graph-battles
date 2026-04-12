import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { GameStore } from '../state/GameStore';
import { UserActionDispatch } from '../state/types';
import { GameOrchestrator } from '../orchestration/GameOrchestrator';
import { GameRenderer } from '../rendering/GameRenderer';
import { GameProvider } from '../providers/GameProvider';
import { RenderMap } from '../map/MapParser';
import { useBabylonJs } from './BabylonJsProvider';
import { AssetLoader } from '../rendering';

export const GameStoreContext = createContext<GameStore | null>(null);
export const UserActionDispatchContext = createContext<UserActionDispatch | null>(null);

type GameContextProviderProps = {
  provider: GameProvider;
  renderMap: RenderMap;
  assetLoader: AssetLoader;
  children: ReactNode;
};

/**
 * Creates the orchestrator from BabylonJs context, initialises it,
 * then provides GameStoreContext and UserActionDispatchContext to children.
 * Uses a ref to ensure only one orchestrator is created even under StrictMode double-mount.
 */
export function GameContextProvider({ provider, renderMap, assetLoader, children }: GameContextProviderProps) {
  const { scene, camera } = useBabylonJs();
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const [orchestrator, setOrchestrator] = useState<GameOrchestrator | null>(null);

  useEffect(() => {
    if (orchestratorRef.current != null) {
      setOrchestrator(orchestratorRef.current);
      return;
    }

    const renderer = new GameRenderer(scene, camera as ArcRotateCamera, assetLoader);

    const store = new GameStore({
      game: null!,
      map: null!,
      mapRevision: 0,
      currentPlayerId: '',
      turn: 0,
      turnPhase: 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hover: null,
      currentResolution: null,
      visibilityMode: 'current-player',
    });

    const orch = new GameOrchestrator(store, renderer, provider);
    orchestratorRef.current = orch;

    orch.initialise(renderMap).then(() => {
      setOrchestrator(orch);
    });

    // Don't dispose on cleanup — StrictMode remounts effects in dev
  }, [scene, camera, provider, renderMap]);

  if (!orchestrator) {
    return null;
  }

  return (
    <GameStoreContext.Provider value={orchestrator.store}>
      <UserActionDispatchContext.Provider value={orchestrator}>
        {children}
      </UserActionDispatchContext.Provider>
    </GameStoreContext.Provider>
  );
}

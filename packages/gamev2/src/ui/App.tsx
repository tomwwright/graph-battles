import { useGameStore } from '../state/useGameStore';
import { useUserActionDispatch } from '../state/useUserActionDispatch';

/**
 * Root UI component rendered inside GameContextProvider.
 * Composes the game UI panels overlaid on the 3D scene.
 */
export function App() {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const turn = useGameStore((s) => s.turn);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', padding: '8px', color: 'white' }}>
        <p>Turn {turn} — {turnPhase}</p>
      </div>
      {/* TODO: GameInfoPanel */}
      {/* TODO: SelectedInfoPanel */}
      {/* TODO: ResolutionPanel */}
      {/* TODO: GameFlowPopups (NextPlayer, Ready, Victory) */}
    </div>
  );
}

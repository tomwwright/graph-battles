import { useGameStore } from '../state/useGameStore';

export function App() {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const turn = useGameStore((s) => s.turn);
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const hoveredTerritoryId = useGameStore((s) => s.hoveredTerritoryId);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '12px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        pointerEvents: 'none',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
      }}
    >
      <div>Turn {turn} — {turnPhase}</div>
      {hoveredTerritoryId && <div>Hovered: {hoveredTerritoryId}</div>}
      {selectedTerritoryId && <div>Selected: {selectedTerritoryId}</div>}
    </div>
  );
}

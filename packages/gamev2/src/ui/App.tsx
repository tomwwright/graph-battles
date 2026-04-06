import { useGameStore } from '../state/useGameStore';
import { hexCenterTile } from '../rendering/HexCoordinates';

export function App() {
  const turnPhase = useGameStore((s) => s.turnPhase);
  const turn = useGameStore((s) => s.turn);
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const hover = useGameStore((s) => s.hover);

  const centerTile = hover ? hexCenterTile(hover.hexCoord) : null;

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
      {hover?.type === 'territory' && <div>Territory: {hover.territoryId}</div>}
      {hover?.type === 'edge' && (
        <div>Edge: {hover.territoryA} ↔ {hover.territoryB}</div>
      )}
      {hover && (
        <div>Hex: ({hover.hexCoord.x}, {hover.hexCoord.z}) Tile: ({centerTile!.x}, {centerTile!.z})</div>
      )}
      {selectedTerritoryId && <div>Selected: {selectedTerritoryId}</div>}
    </div>
  );
}

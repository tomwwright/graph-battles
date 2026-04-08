import { useGameStore } from '../state/useGameStore';
import { useUserActionDispatch } from '../state/useUserActionDispatch';
import { hexCenterTile } from '../rendering/HexCoordinates';

export function App() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const turn = useGameStore((s) => s.turn);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const selectedUnitIds = useGameStore((s) => s.selectedUnitIds);
  const hover = useGameStore((s) => s.hover);
  const currentResolution = useGameStore((s) => s.currentResolution);

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
      <div>Turn {turn} — {turnPhase} — Player: {currentPlayerId}</div>

      {hover?.type === 'territory' && <div>Territory: {hover.territoryId}</div>}
      {hover?.type === 'edge' && (
        <div>Edge: {hover.territoryA} ↔ {hover.territoryB}</div>
      )}
      {hover && (
        <div>Hex: ({hover.hexCoord.x}, {hover.hexCoord.z}) Tile: ({centerTile!.x}, {centerTile!.z})</div>
      )}

      {selectedTerritoryId && <div>Selected: {selectedTerritoryId}</div>}
      {selectedUnitIds.length > 0 && <div>Units: {selectedUnitIds.join(', ')}</div>}

      {currentResolution && (
        <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: 4 }}>
          Resolution: {currentResolution.phase}
          {'unitId' in currentResolution && ` — ${currentResolution.unitId}`}
          {'territoryId' in currentResolution && ` — ${currentResolution.territoryId}`}
          {'locationId' in currentResolution && ` — ${currentResolution.locationId}`}
          {'playerId' in currentResolution && ` — ${currentResolution.playerId}`}
        </div>
      )}

      <div style={{ marginTop: 12, pointerEvents: 'auto', display: 'flex', gap: 8 }}>
        {turnPhase === 'planning' && (
          <button onClick={() => dispatch.onReadyPlayer()}>
            Ready
          </button>
        )}
        {turnPhase === 'replaying' && (
          <>
            <button onClick={() => dispatch.onResolveNext()}>
              Resolve Next
            </button>
          </>
        )}
        {turnPhase === 'victory' && (
          <div style={{ color: '#ffd700', fontWeight: 'bold' }}>Victory!</div>
        )}
      </div>
    </div>
  );
}

import { Values } from '@battles/models';
import { useGameStore } from '../state/useGameStore';
import { useUserActionDispatch } from '../state/useUserActionDispatch';
import { hexCenterTile } from '../rendering/HexCoordinates';

const TERRITORY_ACTION_LABELS: Record<string, string> = {
  [Values.TerritoryAction.CREATE_UNIT]: 'Create Unit',
  [Values.TerritoryAction.BUILD_SETTLEMENT]: 'Build Settlement',
  [Values.TerritoryAction.BUILD_FARM]: 'Build Farm',
  [Values.TerritoryAction.BUILD_CITY]: 'Build City',
  [Values.TerritoryAction.BUILD_FORT]: 'Build Fort',
  [Values.TerritoryAction.BUILD_CASTLE]: 'Build Castle',
};

export function App() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const turn = useGameStore((s) => s.turn);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const selectedUnitIds = useGameStore((s) => s.selectedUnitIds);
  const hover = useGameStore((s) => s.hover);
  const currentResolution = useGameStore((s) => s.currentResolution);
  const map = useGameStore((s) => s.map);
  // Subscribe to mapRevision so derivations re-run when the map mutates in place.
  useGameStore((s) => s.mapRevision);

  const centerTile = hover ? hexCenterTile(hover.hexCoord) : null;

  // Selected territory + actions for the current player
  const selectedTerritory = selectedTerritoryId ? map.territory(selectedTerritoryId) : null;
  const territoryOwnedByCurrentPlayer =
    selectedTerritory != null && selectedTerritory.data.playerId === currentPlayerId;
  const currentPlayer = map.player(currentPlayerId);

  const availableActions =
    territoryOwnedByCurrentPlayer && turnPhase === 'planning'
      ? Values.propsToActions(selectedTerritory!.data.properties)
      : [];

  const currentTerritoryAction = selectedTerritory?.currentAction ?? null;

  const computeAffordability = (action: Values.TerritoryAction): { affordable: boolean; foodCost: number; goldCost: number } => {
    const def = Values.TerritoryActionDefinitions[action];
    const foodCost = def.cost.food;
    const goldCost = def.cost.gold;
    if (!selectedTerritory || !currentPlayer) return { affordable: false, foodCost, goldCost };

    // Account for refund of currently-pending action on this territory
    let availableFood = selectedTerritory.data.food;
    let availableGold = currentPlayer.data.gold;
    if (currentTerritoryAction != null) {
      const currentDef = Values.TerritoryActionDefinitions[currentTerritoryAction];
      availableFood += currentDef.cost.food;
      availableGold += currentDef.cost.gold;
    }
    return {
      affordable: availableFood >= foodCost && availableGold >= goldCost,
      foodCost,
      goldCost,
    };
  };

  // Cancel-move surfacing: any selected unit with a pending destination
  const selectedUnitsWithPendingMove = selectedUnitIds.filter((id) => {
    const u = map.unit(id);
    return u != null && u.destinationId != null;
  });

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
      <div>Gold: {currentPlayer?.data.gold ?? 0}</div>

      {hover?.type === 'territory' && (() => {
        const t = map.territory(hover.territoryId);
        return <div>Territory: {hover.territoryId}{t && ` (food ${t.data.food})`}</div>;
      })()}
      {hover?.type === 'edge' && (
        <div>Edge: {hover.territoryA} ↔ {hover.territoryB}</div>
      )}
      {hover && (
        <div>Hex: ({hover.hexCoord.x}, {hover.hexCoord.z}) Tile: ({centerTile!.x}, {centerTile!.z})</div>
      )}

      {selectedTerritory && (
        <div>
          Selected: {selectedTerritoryId} — food {selectedTerritory.data.food}
        </div>
      )}
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

      <div style={{ marginTop: 12, pointerEvents: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {turnPhase === 'planning' && (
          <button onClick={() => dispatch.onReadyPlayer()}>
            Ready
          </button>
        )}
        {turnPhase === 'planning' && selectedUnitsWithPendingMove.length > 0 && (
          <button onClick={() => dispatch.onCancelMove(selectedUnitsWithPendingMove)}>
            Cancel Move ({selectedUnitsWithPendingMove.length})
          </button>
        )}
        {turnPhase === 'replaying' && (
          <button onClick={() => dispatch.onResolveNext()}>
            Resolve Next
          </button>
        )}
        {turnPhase === 'victory' && (
          <div style={{ color: '#ffd700', fontWeight: 'bold' }}>Victory!</div>
        )}
      </div>

      {availableActions.length > 0 && selectedTerritoryId != null && (
        <div
          style={{
            marginTop: 12,
            pointerEvents: 'auto',
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxWidth: 240,
          }}
        >
          <div style={{ fontWeight: 'bold' }}>
            Actions — Territory {selectedTerritoryId}
          </div>
          {currentTerritoryAction != null && (
            <>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                pending: {TERRITORY_ACTION_LABELS[currentTerritoryAction]}
              </div>
              <button
                onClick={() => dispatch.onCancelTerritoryAction(selectedTerritoryId)}
              >
                Cancel Action
              </button>
            </>
          )}
          {availableActions.map((action) => {
            const { affordable, foodCost, goldCost } = computeAffordability(action);
            const isCurrent = currentTerritoryAction === action;
            return (
              <button
                key={action}
                disabled={!affordable && !isCurrent}
                onClick={() => dispatch.onTerritoryAction(selectedTerritoryId, action)}
                style={{
                  textAlign: 'left',
                  opacity: !affordable && !isCurrent ? 0.5 : 1,
                  fontWeight: isCurrent ? 'bold' : 'normal',
                }}
              >
                {TERRITORY_ACTION_LABELS[action]} — {foodCost}f / {goldCost}g
                {isCurrent && ' ✓'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

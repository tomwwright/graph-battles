import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import { selectCurrentPlayerId } from '../../state/selectors';
import { UnitInfo } from './UnitInfo';
import { TerritoryInfo } from './TerritoryInfo';
import styles from './SelectedInfoPanel.module.css';

export function SelectedInfoPanel() {
  const dispatch = useDispatch();
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const selectedUnitIds = useGameStore((s) => s.selectedUnitIds);
  const currentPlayerId = useGameStore(selectCurrentPlayerId);
  const phaseType = useGameStore((s) => s.phase.type);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  const isPlanning = phaseType === 'planning';
  const currentPlayer = currentPlayerId ? map.player(currentPlayerId) : null;

  if (selectedUnitIds.length > 0) {
    return (
      <div className={styles.container}>
        {selectedUnitIds.map((id) => {
          const unit = map.unit(id);
          if (!unit) return null;
          return (
            <UnitInfo
              key={id}
              unit={unit}
              isPlanning={isPlanning}
              onCancelMove={() => dispatch({ type: 'cancel-move', unitIds: [id] })}
            />
          );
        })}
      </div>
    );
  }

  if (selectedTerritoryId != null) {
    const territory = map.territory(selectedTerritoryId);
    if (!territory) return null;

    return (
      <div className={styles.container}>
        <TerritoryInfo
          territory={territory}
          currentPlayer={currentPlayer}
          isPlanning={isPlanning}
          onTerritoryAction={(action) =>
            dispatch({ type: 'territory-action', territoryId: selectedTerritoryId, action })
          }
          onCancelTerritoryAction={() =>
            dispatch({ type: 'territory-action', territoryId: selectedTerritoryId, action: null })
          }
        />
      </div>
    );
  }

  return null;
}

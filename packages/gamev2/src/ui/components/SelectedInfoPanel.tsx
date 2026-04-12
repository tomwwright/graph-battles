import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import { UnitInfo } from './UnitInfo';
import { TerritoryInfo } from './TerritoryInfo';
import styles from './SelectedInfoPanel.module.css';

export function SelectedInfoPanel() {
  const dispatch = useUserActionDispatch();
  const selectedTerritoryId = useGameStore((s) => s.selectedTerritoryId);
  const selectedUnitIds = useGameStore((s) => s.selectedUnitIds);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  const isPlanning = turnPhase === 'planning';
  const currentPlayer = map.player(currentPlayerId);

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
              onCancelMove={() => dispatch.onCancelMove([id])}
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
          onTerritoryAction={(action) => dispatch.onTerritoryAction(selectedTerritoryId, action)}
          onCancelTerritoryAction={() => dispatch.onCancelTerritoryAction(selectedTerritoryId)}
        />
      </div>
    );
  }

  return null;
}

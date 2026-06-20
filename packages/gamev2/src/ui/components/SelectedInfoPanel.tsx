import type { ReactNode } from 'react';
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

  let content: ReactNode = null;

  if (selectedUnitIds.length > 0) {
    content = selectedUnitIds.map((id) => {
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
    });
  } else if (selectedTerritoryId != null) {
    const territory = map.territory(selectedTerritoryId);
    if (territory) {
      content = (
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
      );
    }
  }

  if (!content) return null;

  return (
    <div className={styles.container}>
      {content}
      <button className={styles.unselectButton} onClick={() => dispatch({ type: 'clear-selection' })}>
        Unselect
      </button>
    </div>
  );
}

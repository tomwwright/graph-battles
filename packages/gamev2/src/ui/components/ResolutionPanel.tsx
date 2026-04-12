import { useState, useEffect } from 'react';
import { Combat } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import { UnitInfo } from './UnitInfo';
import { TerritoryInfo } from './TerritoryInfo';
import { PlayerInfo } from './PlayerInfo';
import { CombatInfo } from './CombatInfo';
import panelStyles from './panels.module.css';
import styles from './ResolutionPanel.module.css';

const PHASE_LABELS: Record<string, string> = {
  move: 'Movement',
  combat: 'Combat',
  'add-defend': 'Defenders',
  food: 'Food',
  gold: 'Gold',
  'territory-control': 'Territory Captures',
  'territory-action': 'Territory Actions',
};

export function ResolutionPanel() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const currentResolution = useGameStore((s) => s.currentResolution);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay || !currentResolution) return;
    const timer = setTimeout(() => {
      dispatch.onResolveNext();
    }, 800);
    return () => clearTimeout(timer);
  }, [autoPlay, currentResolution, dispatch]);

  if (turnPhase !== 'replaying') return null;

  const currentPlayer = map.player(currentPlayerId);

  const renderDetail = () => {
    if (!currentResolution) return null;

    switch (currentResolution.phase) {
      case 'move':
      case 'add-defend': {
        const unit = map.unit(currentResolution.unitId);
        if (!unit) return null;
        return <UnitInfo unit={unit} isPlanning={false} />;
      }
      case 'combat': {
        const location = map.territory(currentResolution.locationId) ?? map.edge(currentResolution.locationId);
        if (!location) return null;
        const combat = new Combat(location);
        return <CombatInfo combat={combat} />;
      }
      case 'food':
      case 'territory-control':
      case 'territory-action': {
        const territory = map.territory(currentResolution.territoryId);
        if (!territory) return null;
        return <TerritoryInfo territory={territory} currentPlayer={currentPlayer} isPlanning={false} />;
      }
      case 'gold': {
        const player = map.player(currentResolution.playerId);
        if (!player) return null;
        return (
          <div className={panelStyles.panel}>
            <PlayerInfo player={player} isActive={false} />
          </div>
        );
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={panelStyles.panel}>
        <div className={panelStyles.heading}>
          {currentResolution ? PHASE_LABELS[currentResolution.phase] ?? currentResolution.phase : '---'}
        </div>
        <div className={styles.controls}>
          <button className={panelStyles.button} onClick={() => dispatch.onResolveNext()}>
            Resolve Next
          </button>
          <label className={styles.autoPlayLabel}>
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
            />
            Auto
          </label>
        </div>
      </div>
      {renderDetail()}
    </div>
  );
}

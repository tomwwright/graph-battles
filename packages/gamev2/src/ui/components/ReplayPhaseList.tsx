import { useGameStore } from '../../state/useGameStore';
import { PHASE_LABELS, REPLAY_PHASE_ORDER } from './phaseLabels';
import panelStyles from './panels.module.css';
import styles from './ReplayPhaseList.module.css';

export function ReplayPhaseList() {
  const phaseType = useGameStore((s) => s.phase.type);
  const currentResolution = useGameStore((s) => s.currentResolution);

  if (phaseType !== 'replaying') return null;

  const currentPhase = currentResolution?.phase ?? null;

  return (
    <div className={`${panelStyles.panel} ${styles.container}`}>
      <div className={panelStyles.heading}>Replay</div>
      <ul className={styles.list}>
        {REPLAY_PHASE_ORDER.map((phase) => (
          <li
            key={phase}
            className={`${styles.item} ${phase === currentPhase ? styles.current : ''}`}
          >
            {PHASE_LABELS[phase]}
          </li>
        ))}
      </ul>
    </div>
  );
}

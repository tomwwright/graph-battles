import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import panelStyles from './panels.module.css';
import styles from './ActionBar.module.css';

export function ActionBar() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);

  if (turnPhase === 'planning') {
    return (
      <div className={styles.container}>
        <button className={panelStyles.buttonPrimary} onClick={() => dispatch.onReadyPlayer()}>
          Ready
        </button>
      </div>
    );
  }

  return null;
}

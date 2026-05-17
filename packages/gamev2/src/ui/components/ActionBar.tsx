import { useContext, useEffect } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import { GameStoreContext } from '../GameOrchestratorProvider';
import panelStyles from './panels.module.css';
import styles from './ActionBar.module.css';

export function ActionBar() {
  const dispatch = useDispatch();
  const phaseType = useGameStore((s) => s.phase.type);
  const autoResolve = useGameStore((s) => s.autoResolve);
  const currentResolution = useGameStore((s) => s.currentResolution);
  const store = useContext(GameStoreContext);

  useEffect(() => {
    if (phaseType !== 'replaying') return;
    if (!autoResolve || !currentResolution) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'resolve-next' });
    }, 800);
    return () => clearTimeout(timer);
  }, [phaseType, autoResolve, currentResolution, dispatch]);

  if (phaseType === 'planning') {
    return (
      <div className={styles.container}>
        <button className={panelStyles.buttonPrimary} onClick={() => dispatch({ type: 'ready-player' })}>
          Ready
        </button>
      </div>
    );
  }

  if (phaseType === 'replaying') {
    if (autoResolve) {
      return (
        <div className={styles.container}>
          <button
            className={panelStyles.buttonDanger}
            onClick={() => store?.setState({ autoResolve: false })}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <button
          className={panelStyles.button}
          onClick={() => store?.setState({ autoResolve: true })}
          disabled={!currentResolution}
        >
          Replay All
        </button>
        <button
          className={panelStyles.buttonPrimary}
          onClick={() => dispatch({ type: 'resolve-next' })}
          disabled={!currentResolution}
        >
          Next
        </button>
      </div>
    );
  }

  return null;
}

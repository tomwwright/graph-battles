import { useContext, useEffect } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import { GameStoreContext } from '../GameContextProvider';
import panelStyles from './panels.module.css';
import styles from './ActionBar.module.css';

export function ActionBar() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const autoResolve = useGameStore((s) => s.autoResolve);
  const currentResolution = useGameStore((s) => s.currentResolution);
  const store = useContext(GameStoreContext);

  useEffect(() => {
    if (turnPhase !== 'replaying') return;
    if (!autoResolve || !currentResolution) return;
    const timer = setTimeout(() => {
      dispatch.onResolveNext();
    }, 800);
    return () => clearTimeout(timer);
  }, [turnPhase, autoResolve, currentResolution, dispatch]);

  if (turnPhase === 'planning') {
    return (
      <div className={styles.container}>
        <button className={panelStyles.buttonPrimary} onClick={() => dispatch.onReadyPlayer()}>
          Ready
        </button>
      </div>
    );
  }

  if (turnPhase === 'replaying') {
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
          onClick={() => dispatch.onResolveNext()}
          disabled={!currentResolution}
        >
          Next
        </button>
      </div>
    );
  }

  return null;
}

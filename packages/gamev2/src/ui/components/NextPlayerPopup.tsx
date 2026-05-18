import { Values } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import styles from './Popup.module.css';

export function NextPlayerPopup() {
  const dispatch = useDispatch();
  const phase = useGameStore((s) => s.phase);
  const game = useGameStore((s) => s.game);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  if (phase.type !== 'next-player') return null;

  const player = map.player(phase.currentPlayerId);
  if (!player) return null;

  const colour = Values.ColourStrings[player.data.colour] ?? 'white';

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.popupHeading}>
          Turn {game.turn}/{game.data.maxTurns}
        </div>
        <div className={styles.popupText}>
          <span style={{ color: colour, fontWeight: 'bold' }}>
            Player {player.data.id}
          </span>{' '}
          you're up!
        </div>
        <button className={styles.popupButton} onClick={() => dispatch({ type: 'confirm-next-player' })}>
          Go
        </button>
      </div>
    </div>
  );
}

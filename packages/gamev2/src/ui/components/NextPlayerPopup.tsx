import { Values } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import styles from './Popup.module.css';

export function NextPlayerPopup() {
  const dispatch = useUserActionDispatch();
  const turnPhase = useGameStore((s) => s.turnPhase);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const game = useGameStore((s) => s.game);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  if (turnPhase !== 'next-player') return null;

  const player = map.player(currentPlayerId);
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
        <button className={styles.popupButton} onClick={() => dispatch.onConfirmNextPlayer()}>
          Go
        </button>
      </div>
    </div>
  );
}

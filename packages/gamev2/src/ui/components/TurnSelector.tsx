import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import styles from './TurnSelector.module.css';

const PHASE_CLASSES: Record<string, string> = {
  planning: styles.phasePlanning,
  replaying: styles.phaseReplaying,
  'next-player': styles.phaseNextPlayer,
  victory: styles.phaseVictory,
};

const PHASE_LABELS: Record<string, string> = {
  planning: 'Planning',
  waiting: 'Waiting',
  replaying: 'Replaying',
  'next-player': 'Next Player',
  victory: 'Victory',
};

export function TurnSelector() {
  const dispatch = useDispatch();
  const turn = useGameStore((s) => s.turn);
  const phaseType = useGameStore((s) => s.phase.type);
  const game = useGameStore((s) => s.game);

  const numTurns = game.data.maps.length;

  return (
    <div className={styles.container}>
      <span className={styles.label}>Turn</span>
      <div className={styles.turnButtons}>
        {Array.from({ length: numTurns }, (_, i) => i + 1).map((t) => (
          <button
            key={t}
            className={t === numTurns ? styles.turnButtonLatest : styles.turnButton}
            disabled={t === turn}
            onClick={() => dispatch({ type: 'set-turn', turn: t })}
          >
            {t}
          </button>
        ))}
      </div>
      <span className={PHASE_CLASSES[phaseType] ?? styles.phaseBadge}>
        {PHASE_LABELS[phaseType] ?? phaseType}
      </span>
    </div>
  );
}

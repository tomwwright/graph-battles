import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import styles from './TurnSelector.module.css';

const PHASE_CLASSES: Record<string, string> = {
  planning: styles.phasePlanning,
  replaying: styles.phaseReplaying,
  'next-player': styles.phaseNextPlayer,
  victory: styles.phaseVictory,
};

const PHASE_LABELS: Record<string, string> = {
  planning: 'Planning',
  ready: 'Ready',
  replaying: 'Replaying',
  'next-player': 'Next Player',
  victory: 'Victory',
};

export function TurnSelector() {
  const dispatch = useUserActionDispatch();
  const turn = useGameStore((s) => s.turn);
  const turnPhase = useGameStore((s) => s.turnPhase);
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
            onClick={() => dispatch.onSetTurn(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <span className={PHASE_CLASSES[turnPhase] ?? styles.phaseBadge}>
        {PHASE_LABELS[turnPhase] ?? turnPhase}
      </span>
    </div>
  );
}

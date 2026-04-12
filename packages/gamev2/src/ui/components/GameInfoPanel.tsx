import { useGameStore } from '../../state/useGameStore';
import { useUserActionDispatch } from '../../state/useUserActionDispatch';
import { PlayerInfo } from './PlayerInfo';
import panelStyles from './panels.module.css';
import styles from './GameInfoPanel.module.css';

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

export function GameInfoPanel() {
  const dispatch = useUserActionDispatch();
  const turn = useGameStore((s) => s.turn);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const game = useGameStore((s) => s.game);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  const numTurns = game.data.maps.length;
  const players = map.players;

  return (
    <div className={`${panelStyles.panel} ${styles.container}`}>
      <div className={styles.turnRow}>
        <span>Turns</span>
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

      <hr className={panelStyles.divider} />

      {players.map((player) => (
        <PlayerInfo
          key={player.data.id}
          player={player}
          isActive={player.data.id === currentPlayerId}
        />
      ))}

      {turnPhase === 'planning' && (
        <>
          <hr className={panelStyles.divider} />
          <button className={panelStyles.buttonPrimary} onClick={() => dispatch.onReadyPlayer()}>
            Ready
          </button>
        </>
      )}
    </div>
  );
}

import { useGameStore } from '../../state/useGameStore';
import { selectCurrentPlayerId } from '../../state/selectors';
import { PlayerInfo } from './PlayerInfo';
import panelStyles from './panels.module.css';
import styles from './PlayerLeaderboard.module.css';

export function PlayerLeaderboard() {
  const currentPlayerId = useGameStore(selectCurrentPlayerId);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  const players = map.players;

  return (
    <div className={`${panelStyles.panel} ${styles.container}`}>
      <div className={panelStyles.heading}>Players</div>
      {players.map((player) => (
        <PlayerInfo
          key={player.data.id}
          player={player}
          isActive={player.data.id === currentPlayerId}
        />
      ))}
    </div>
  );
}

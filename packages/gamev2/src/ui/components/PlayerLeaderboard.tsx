import { useGameStore } from '../../state/useGameStore';
import { selectCurrentPlayerId } from '../../state/selectors';
import { useGameSession } from '../GameSessionProvider';
import { PlayerRow } from './PlayerRow';
import styles from './PlayerLeaderboard.module.css';

type PlayerLeaderboardProps = {
  onOpenTerritories: () => void;
};

export function PlayerLeaderboard({ onOpenTerritories }: PlayerLeaderboardProps) {
  const currentPlayerId = useGameStore(selectCurrentPlayerId);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);
  const session = useGameSession();

  const players = map.players;

  return (
    <div className={styles.container}>
      {players.map((player) => (
        <PlayerRow
          key={player.data.id}
          player={player}
          isActive={player.data.id === currentPlayerId}
          sessionUserId={session.userId}
          onOpenTerritories={onOpenTerritories}
        />
      ))}
    </div>
  );
}

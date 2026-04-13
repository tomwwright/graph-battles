import type { GameSummary } from '../services/api';
import { toTimeDescription } from '../util';
import styles from './GameCard.module.css';

type RemoteGameCardProps = {
  game: GameSummary;
  onOpen: () => void;
};

export function RemoteGameCard({ game, onOpen }: RemoteGameCardProps) {
  const leaderboardText = game.leaderboard
    .map((leader) => `${leader.name} (${leader.victoryPoints})`)
    .join(', ');

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h3>{game.gameId}</h3>
        <small>
          <p>Updated {toTimeDescription(Date.now() - game.updatedAt)} ago</p>
        </small>
      </div>
      <div className={styles.stats}>
        <p>
          {game.maxVictoryPoints} Victory Points ({game.turn}/{game.maxTurns} turns)
        </p>
        <p>
          <small>{game.numTerritories} territories</small>
        </p>
        <p>
          <small>{leaderboardText}</small>
        </p>
      </div>
      <div className={styles.actions}>
        <button onClick={onOpen}>Open</button>
      </div>
    </div>
  );
}

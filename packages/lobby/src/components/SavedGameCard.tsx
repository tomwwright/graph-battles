import { GameMap, PlayerData } from '@battles/models';
import { PlayerList } from './PlayerList';
import type { SavedGame } from '../services/local-storage';
import { toTimeDescription } from '../util';
import styles from './GameCard.module.css';

type SavedGameCardProps = {
  game: SavedGame;
  onOpen: () => void;
  onDelete: () => void;
};

export function SavedGameCard({ game, onOpen, onDelete }: SavedGameCardProps) {
  const latestMap = new GameMap(game.gameData.maps[game.gameData.maps.length - 1]);
  const leaders = latestMap.winningPlayers(0, false);

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h3>{game.gameData.id}</h3>
        <small>
          <p>{latestMap.territoryIds.length} territories</p>
          <PlayerList
            users={game.gameData.users}
            players={game.gameData.users.map(
              (user) => game.gameData.maps[0].dataMap[user.playerIds[0]] as PlayerData
            )}
          />
        </small>
      </div>
      <div className={styles.stats}>
        <p>
          Turn {game.gameData.maps.length}/{game.gameData.maxTurns}
        </p>
        <p>
          Victory Points {leaders[0].victoryPoints}/{game.gameData.maxVictoryPoints}
        </p>
        <p>
          <small>Updated {toTimeDescription(Date.now() - game.lastUpdated)} ago</small>
        </p>
      </div>
      <div className={styles.actions}>
        <button onClick={onOpen}>Open</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

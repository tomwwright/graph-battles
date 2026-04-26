import { Player, Values } from '@battles/models';
import styles from './panels.module.css';
import panelStyles from './PlayerLeaderboard.module.css';

type PlayerInfoProps = {
  player: Player;
  isActive: boolean;
};

export function PlayerInfo({ player, isActive }: PlayerInfoProps) {
  const colour = Values.ColourStrings[player.data.colour] ?? 'gray';
  const totalGoldProduction =
    player.data.goldProduction +
    player.territories.reduce((sum, t) => sum + t.goldProduction, 0);

  return (
    <div className={`${panelStyles.playerRow} ${isActive ? panelStyles.playerRowActive : ''}`}>
      <span className={styles.colourSwatch} style={{ backgroundColor: colour }} />
      <span style={{ color: colour }}>{player.data.id}</span>
      <span className={styles.small}>
        Gold {player.data.gold} (+{totalGoldProduction})
      </span>
      <span className={styles.small}>VP {player.victoryPoints}</span>
      {isActive && <span className={panelStyles.activeBadge}>Active</span>}
    </div>
  );
}

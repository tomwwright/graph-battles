import { Game, GameMap, Player, Values } from '@battles/models';
import type { ID } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { ExpandablePanel } from './ExpandablePanel';
import panelStyles from './panels.module.css';
import styles from './PlayerRow.module.css';

const VP_HISTORY_TURNS = 5;

type PlayerRowProps = {
  player: Player;
  isActive: boolean;
  sessionUserId: ID | undefined;
  onOpenTerritories: () => void;
};

function localityIcon(game: Game, playerId: ID, sessionUserId: ID | undefined): string {
  if (sessionUserId == null) return '👤';
  const user = game.users.find((u) => u.data.playerIds.includes(playerId));
  return user?.data.id === sessionUserId ? '👤' : '🌐';
}

function vpHistory(game: Game, playerId: ID, count: number): number[] {
  const maps = game.data.maps;
  const start = Math.max(0, maps.length - count);
  return maps.slice(start).map((mapData) => {
    const map = new GameMap(mapData);
    const player = map.player(playerId);
    return player ? player.victoryPoints : 0;
  });
}

export function PlayerRow({ player, isActive, sessionUserId, onOpenTerritories }: PlayerRowProps) {
  const game = useGameStore((s) => s.game);
  useGameStore((s) => s.mapRevision);

  const colour = Values.ColourStrings[player.data.colour] ?? 'gray';
  const totalGoldProduction =
    player.data.goldProduction +
    player.territories.reduce((sum, t) => sum + t.goldProduction, 0);

  const header = (
    <span className={styles.header}>
      <span aria-hidden="true" className={styles.localityIcon}>
        {localityIcon(game, player.data.id, sessionUserId)}
      </span>
      <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
      <span style={{ color: colour }}>{player.data.id}</span>
      <span className={styles.metric}>{player.victoryPoints} VP</span>
      <span className={styles.metric}>
        {player.data.gold} Gold (+{totalGoldProduction})
      </span>
      {isActive && <span className={styles.activeBadge}>Active</span>}
      {player.ready && <span className={styles.readyBadge}>Ready</span>}
    </span>
  );

  const history = vpHistory(game, player.data.id, VP_HISTORY_TURNS);

  return (
    <ExpandablePanel header={header} showCaret={false}>
      <div className={styles.bodyRow}>
        <span className={panelStyles.small}>VPs</span>
        <span>{history.length > 0 ? history.join(', ') : '—'}</span>
      </div>
      {player.territories.length === 0 && (
        <div className={panelStyles.small}>No territories.</div>
      )}
      {player.territories.map((t) => (
        <button
          key={t.data.id}
          type="button"
          className={styles.territoryButton}
          onClick={onOpenTerritories}
        >
          <span>Territory {t.data.id}</span>
          <span className={panelStyles.small}>{t.data.properties.length} VP</span>
          <span className={panelStyles.small}>{t.units.length} units</span>
        </button>
      ))}
    </ExpandablePanel>
  );
}

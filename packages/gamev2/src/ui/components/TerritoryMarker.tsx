import { useRef } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { selectCurrentPlayerId } from '../../state/selectors';
import { isLocationVisible } from '../../orchestration/Utils';
import { useMarkerRegistration } from '../hooks/useMarkerRegistration';
import type { GameRenderer } from '../../rendering/GameRenderer';
import styles from './MarkerLayer.module.css';
import { colourToCss, playerShape } from './markerHelpers';

type Props = {
  id: string;
  offsetAmount: number;
  renderer: GameRenderer;
};

export function TerritoryMarker({ id, offsetAmount, renderer }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const playerId = useGameStore((s) => s.map?.territory(id)?.data.playerId ?? null);
  const playerIndex = useGameStore((s) => {
    if (!s.map) return -1;
    const idx = s.map.playerIds.indexOf(s.map.territory(id)?.data.playerId ?? '');
    return idx >= 0 ? idx : -1;
  });
  const playerColour = useGameStore((s) => {
    if (!s.map || !playerId) return null;
    return s.map.player(playerId)?.data.colour ?? null;
  });
  const territory = useGameStore((s) => {
    if (!s.map) return null;
    return s.map.territory(id);
  });

  const hasAction = useGameStore((s) => {
    const currentPlayerId = selectCurrentPlayerId(s);
    if (!currentPlayerId) return false;
    if (s.visibilityMode === 'current-player' && !isLocationVisible(s.map, currentPlayerId, id)) return false;
    return territory?.currentAction != null;
  });
  const isSelected = useGameStore((s) => s.selectedTerritoryId === id);

  useMarkerRegistration(id, ref, () => renderer.getTerritoryWorldPos(id), offsetAmount);

  const shape = playerIndex >= 0 ? playerShape(playerIndex) : '○';
  const color = playerColour != null ? colourToCss(playerColour) : '#888';

  return (
    <div ref={ref} className={`${styles.pill}${isSelected ? ` ${styles.pillSelected}` : ''}`}>
      <span className={styles.chip} style={{ color }}>
        {shape}{" "}
      </span>
      Territory {territory?.data.id}{" "}
      <span className={styles.symbol}>
        {hasAction && "[A]"}
      </span>
    </div>
  );
}

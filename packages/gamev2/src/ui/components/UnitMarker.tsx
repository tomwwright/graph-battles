import { useRef } from 'react';
import { Values } from '@battles/models';
import { useGameStore } from '../../state/useGameStore';
import { selectCurrentPlayerId } from '../../state/selectors';
import { isUnitVisible } from '../../orchestration/Utils';
import { useMarkerRegistration } from '../hooks/useMarkerRegistration';
import type { GameRenderer } from '../../rendering/GameRenderer';
import styles from './MarkerLayer.module.css';
import { colourToCss, playerShape } from './markerHelpers';

type Props = {
  id: string;
  offsetAmount: number;
  renderer: GameRenderer;
};

export function UnitMarker({ id, offsetAmount, renderer }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const playerId = useGameStore((s) => s.map?.unit(id)?.data.playerId ?? null);
  const playerIndex = useGameStore((s) => {
    if (!s.map) return -1;
    const pid = s.map.unit(id)?.data.playerId ?? '';
    const idx = s.map.playerIds.indexOf(pid);
    return idx >= 0 ? idx : -1;
  });
  const playerColour = useGameStore((s) => {
    if (!s.map || !playerId) return null;
    return s.map.player(playerId)?.data.colour ?? null;
  });
  const isVisible = useGameStore((s) => {
    if (!s.map) return false;
    if (s.visibilityMode === 'all') return true;
    const currentPlayerId = selectCurrentPlayerId(s);
    if (!currentPlayerId) return false;
    return isUnitVisible(s.map, currentPlayerId, id);
  });
  const unit = useGameStore((s) => s.map?.unit(id));
  const isMoving = useGameStore((s) => unit?.destinationId != null);
  const isDefending = useGameStore((s) => unit?.data.statuses.includes(Values.Status.DEFEND) ?? false);
  const isStarving = useGameStore((s) => unit?.data.statuses.includes(Values.Status.STARVE) ?? false);
  const isSelected = useGameStore((s) => s.selectedUnitIds.includes(id));

  useMarkerRegistration(id, ref, () => renderer.getUnitRenderer().getMesh(id)?.getAbsolutePosition() ?? null, offsetAmount);

  if (!isVisible) return null;

  const shape = playerIndex >= 0 ? playerShape(playerIndex) : '○';
  const color = playerColour != null ? colourToCss(playerColour) : '#888';

  return (
    <div ref={ref} className={`${styles.pill}${isSelected ? ` ${styles.pillSelected}` : ''}`}>
      <span className={styles.chip} style={{ color }}>
        {shape}
      </span>
      Unit {unit?.data.id}{" "}
      {isMoving && <span className={styles.symbol}>[M]</span>}
      {isDefending && <span className={styles.symbol}>[D]</span>}
      {isStarving && <span className={styles.symbol}>[S]</span>}
    </div>
  );
}

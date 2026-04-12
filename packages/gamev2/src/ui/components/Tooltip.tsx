import { useGameStore } from '../../state/useGameStore';
import { useCursor } from '../CursorProvider';

export function Tooltip() {
  const cursor = useCursor();
  const hover = useGameStore((s) => s.hover);
  const map = useGameStore((s) => s.map);
  useGameStore((s) => s.mapRevision);

  if (!hover) return null;

  let text: string;
  if (hover.type === 'territory') {
    const territory = map.territory(hover.territoryId);
    const food = territory ? ` (food ${territory.data.food})` : '';
    text = `Territory ${hover.territoryId}${food}`;
  } else {
    text = `Edge: ${hover.territoryA} \u2194 ${hover.territoryB}`;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: cursor.x + 10,
        top: cursor.y + 10,
        padding: '6px 10px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        zIndex: 20,
      }}
    >
      {text}
    </div>
  );
}

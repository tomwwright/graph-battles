import { Unit, Values } from '@battles/models';
import panelStyles from './panels.module.css';

const STATUS_LABELS: Record<number, string> = {
  [Values.Status.DEFEND]: 'Defending',
  [Values.Status.STARVE]: 'Starving',
};

type UnitInfoProps = {
  unit: Unit;
  isPlanning: boolean;
  onCancelMove?: () => void;
};

export function UnitInfo({ unit, isPlanning, onCancelMove }: UnitInfoProps) {
  const colour = unit.player ? Values.ColourStrings[unit.player.data.colour] : 'gray';

  return (
    <div className={panelStyles.panel} style={{ marginBottom: 4 }}>
      <div className={panelStyles.heading}>
        Unit {unit.data.id}{' '}
        <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
        <span style={{ color: colour, marginLeft: 4 }}>
          {unit.player ? `Player ${unit.data.playerId}` : 'No player'}
        </span>
      </div>
      <div className={panelStyles.small}>Location {unit.data.locationId}</div>
      <div className={panelStyles.small}>Food Consumption {unit.foodConsumption}</div>
      {unit.data.statuses.length > 0 && (
        <div className={panelStyles.small}>
          {unit.data.statuses.map((s) => STATUS_LABELS[s] ?? `Status ${s}`).join(', ')}
        </div>
      )}
      {unit.destinationId != null && isPlanning && onCancelMove && (
        <>
          <div className={panelStyles.small}>Moving to {unit.destinationId}</div>
          <button className={panelStyles.buttonDanger} onClick={onCancelMove} style={{ marginTop: 4 }}>
            Cancel Move
          </button>
        </>
      )}
    </div>
  );
}

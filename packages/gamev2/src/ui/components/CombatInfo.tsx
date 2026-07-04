import { Combat, Combatant, Unit, Values } from '@battles/models';
import panelStyles from './panels.module.css';

type CombatInfoProps = {
  combat: Combat;
};

export function CombatInfo({ combat }: CombatInfoProps) {
  const outcome = computeOutcome(combat);

  return (
    <>
      <div className={panelStyles.panel}>
        <div className={panelStyles.heading}>Combat {combat.location.data.id}</div>

        {combat.combatants.map((combatant, i) => (
          <div key={i}>
            {i > 0 && <hr className={panelStyles.divider} />}
            <CombatantBreakdown combatant={combatant} />
          </div>
        ))}

        {outcome && (
          <>
            <hr className={panelStyles.divider} />
            <div className={panelStyles.small}>
              <span aria-hidden="true" style={{ marginRight: 6, opacity: 0.8 }}>ⓘ</span>
              {outcome}
            </div>
          </>
        )}
      </div>

      <CombatUnitPanels combat={combat} />
    </>
  );
}

function CombatUnitPanels({ combat }: { combat: Combat }) {
  const units = combat.combatants.flatMap((c) => c.units);
  if (units.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {units.map((u) => (
        <div key={u.data.id} className={panelStyles.panel}>
          <CombatUnitRow unit={u} />
        </div>
      ))}
    </div>
  );
}

function CombatantBreakdown({ combatant }: { combatant: Combatant }) {
  const colour = combatant.player ? Values.ColourStrings[combatant.player.data.colour] : 'gray';
  const label = combatant.player ? `Player ${combatant.player.data.id}` : 'No Player';

  const unitCount = combatant.units.length;
  const defendCount = combatant.units.filter((u) => u.data.statuses.includes(Values.Status.DEFEND)).length;
  const starveCount = combatant.units.filter((u) => u.data.statuses.includes(Values.Status.STARVE)).length;

  return (
    <>
      <div className={panelStyles.row}>
        <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
        <span style={{ color: colour, flex: 1 }}>{label}</span>
        <span className={panelStyles.small}>{combatant.combatRating} pts</span>
      </div>
      <ul style={{ margin: '2px 0 0 22px', padding: 0, listStyle: 'none' }}>
        <ModifierLine label={`${unitCount}x unit`} value={unitCount * 2} />
        {defendCount > 0 && <ModifierLine label={`${defendCount}x defender`} value={defendCount} />}
        {starveCount > 0 && <ModifierLine label={`${starveCount}x starved`} value={-starveCount} />}
      </ul>
    </>
  );
}

function ModifierLine({ label, value }: { label: string; value: number }) {
  const sign = value >= 0 ? '+' : '−';
  return (
    <li className={panelStyles.small} style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span>{sign}{Math.abs(value)}</span>
    </li>
  );
}

function CombatUnitRow({ unit }: { unit: Unit }) {
  const colour = unit.player ? Values.ColourStrings[unit.player.data.colour] : 'gray';
  const statuses = unit.data.statuses;
  return (
    <div className={panelStyles.row}>
      <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
      <span className={panelStyles.small} style={{ flex: 1 }}>{unit.data.id}</span>
      {statuses.includes(Values.Status.DEFEND) && (
        <span className={panelStyles.badge} style={{ backgroundColor: 'rgba(80,120,200,0.6)' }}>defend</span>
      )}
      {statuses.includes(Values.Status.STARVE) && (
        <span className={panelStyles.badge} style={{ backgroundColor: 'rgba(180,60,60,0.6)' }}>starve</span>
      )}
    </div>
  );
}

function computeOutcome(combat: Combat): string | null {
  if (combat.combatants.length < 2) return null;
  const { winner, retainedCount } = combat.outcome();
  if (!winner || retainedCount <= 0) return 'No units remain';
  const winnerLabel = winner.player ? `Player ${winner.player.data.id}` : 'Unclaimed';
  if (retainedCount >= winner.units.length) {
    return `${winnerLabel} retains all ${winner.units.length} unit${winner.units.length === 1 ? '' : 's'}`;
  }
  return `${winnerLabel} retains ${retainedCount} unit${retainedCount === 1 ? '' : 's'}`;
}

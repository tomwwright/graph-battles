import { Combat, Values } from '@battles/models';
import panelStyles from './panels.module.css';

type CombatInfoProps = {
  combat: Combat;
};

export function CombatInfo({ combat }: CombatInfoProps) {
  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.heading}>Combat {combat.location.data.id}</div>
      {combat.combatants.map((combatant, i) => {
        const colour = combatant.player ? Values.ColourStrings[combatant.player.data.colour] : 'gray';
        return (
          <div key={i} className={panelStyles.row}>
            <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
            <span style={{ color: colour }}>
              {combatant.player ? `Player ${combatant.player.data.id}` : 'No Player'}
            </span>
            <span className={panelStyles.small}>{combatant.combatRating} pts</span>
          </div>
        );
      })}
    </div>
  );
}

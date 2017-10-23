import Player from 'models/player';
import UnitContainer from 'models/unitcontainer';
import Unit from 'models/unit';

export class Combatant {
  player: Player;
  units: Unit[];

  constructor(player: Player, units: Unit[]) {
    this.player = player;
    this.units = units;
  }

  get combatRating(): number {
    return this.units.length;
  }
}

export default class Combat {
  location: UnitContainer;
  combatants: Combatant[];

  constructor(location: UnitContainer) {
    this.location = location;

    const combatants: Combatant[] = [];
    for (const unit of location.units) {
      const combatant = combatants.find(
        combatant =>
          (combatant.player === null && unit.player === null) ||
          (combatant.player && unit.player && combatant.player.data.id === unit.player.data.id)
      );
      if (combatant) {
        combatant.units.push(unit);
      } else {
        combatants.push(new Combatant(unit.player, [unit]));
      }
    }
    combatants.sort((a, b) => b.combatRating - a.combatRating);

    this.combatants = combatants;
  }

  resolve() {
    let removedUnits: Unit[] = [];
    let combatants = this.combatants;

    // if there is any difference in the two leading combatants, the winner retains that many units
    let difference = Math.ceil((combatants[0].combatRating - combatants[1].combatRating) / 2);
    if (difference < combatants[0].units.length) {
      removedUnits.push(...combatants[0].units.splice(difference, combatants[0].units.length - difference));
    }

    for (let i = 1; i < combatants.length; ++i) {
      const combatant = combatants[i];
      removedUnits.push(...combatant.units);
    }

    for (const unit of removedUnits) {
      if (unit.player) unit.player.remove(unit.data.id);
      this.location.remove(unit.data.id);
      this.location.map.remove(unit.data.id);
      unit.data.locationId = null;
    }

    return removedUnits;
  }
}

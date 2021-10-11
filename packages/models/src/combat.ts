import { Player } from './player';
import { UnitContainer } from './unitcontainer';
import { Unit } from './unit';
import { Status } from './values';
import { sum, contains } from './utils';

export class Combatant {
  player: Player;
  units: Unit[];

  constructor(player: Player, units: Unit[]) {
    this.player = player;
    this.units = units;
  }

  get combatRating(): number {
    return sum(
      this.units.map((unit) => {
        let rating = 2;
        if (contains(unit.data.statuses, Status.DEFEND)) rating++;
        if (contains(unit.data.statuses, Status.STARVE)) rating--;
        return rating;
      })
    );
  }
}

export class Combat {
  location: UnitContainer;
  combatants: Combatant[];

  constructor(location: UnitContainer) {
    this.location = location;

    const combatants: Combatant[] = [];
    for (const unit of location.units) {
      const combatant = combatants.find(
        (combatant) =>
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

    let unitsRetained = Math.ceil((combatants[0].combatRating - combatants[1].combatRating) / 2);
    if (unitsRetained < combatants[0].units.length) {
      removedUnits.push(...combatants[0].units.splice(unitsRetained, combatants[0].units.length - unitsRetained));
    }

    for (let i = 1; i < combatants.length; ++i) {
      const combatant = combatants[i];
      removedUnits.push(...combatant.units);
    }

    for (const unit of removedUnits) {
      this.location.map.removeUnit(unit);
      unit.data.locationId = null;
    }

    return removedUnits;
  }
}

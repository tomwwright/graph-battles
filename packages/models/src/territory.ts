import { ID, include, exclude, contains, HasID } from './utils';
import { UnitContainer } from './unitcontainer';
import { Player } from './player';
import { Edge } from './edge';
import { PendingActionType } from './map';
import {
  TerritoryProperty,
  TerritoryAction,
  propsToActions,
  propsToType,
} from './values';

export type TerritoryData = HasID & {
  type: 'territory';
  edgeIds: ID[];
  playerId: ID;
  food: number;
  properties: TerritoryProperty[];
};

export class Territory extends UnitContainer<TerritoryData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId] || null;
  }

  get edges() {
    return this.data.edgeIds.map((id) => <Edge>this.map.modelMap[id]);
  }

  get actions() {
    return propsToActions(this.data.properties);
  }

  get type() {
    return propsToType(this.data.properties);
  }

  get currentAction(): TerritoryAction | null {
    const pending = this.map.data.pendingActions.find(
      (a) => a.type === PendingActionType.TERRITORY && a.territoryId === this.data.id
    );
    return pending && pending.type === PendingActionType.TERRITORY ? pending.action : null;
  }

  get foodProduction() {
    return this.hasProperty(TerritoryProperty.FARM) ? 2 : 1;
  }

  get maxFood() {
    let maxFood = 3;
    if (this.hasProperty(TerritoryProperty.SETTLED)) {
      maxFood = 5;
      if (this.hasProperty(TerritoryProperty.FARM)) {
        maxFood = 7;
        if (this.hasProperty(TerritoryProperty.CASTLE)) {
          maxFood = 10;
        }
      }
    }
    return maxFood;
  }

  get goldProduction() {
    let goldProduction = 0;
    if (this.hasProperty(TerritoryProperty.SETTLED)) {
      goldProduction += 1;
      if (this.hasProperty(TerritoryProperty.CITY)) {
        goldProduction += 1;
      }
    }
    return goldProduction;
  }

  hasProperty(...properties: TerritoryProperty[]) {
    return properties.every((property) => contains(this.data.properties, property));
  }

  addProperty(property: TerritoryProperty) {
    this.data.properties = include(this.data.properties, property);
  }

  removeProperty(property: TerritoryProperty) {
    this.data.properties = exclude(this.data.properties, property);
  }

  isVisible(playerId: ID): boolean {
    // players own territories are visible
    if (this.data.playerId === playerId) {
      return true;
    }

    // territory is visible if the player has any units on it
    if (this.units.some(u => u.data.playerId === playerId)) {
      return true;
    }

    // delegate to player on other visibility (e.g. adjacency)
    return this.player.isLocationVisible(this.data.id);
  }
}

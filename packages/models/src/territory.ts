import { ID, include, exclude, contains, sum, clamp, unique, HasID } from './utils';
import { UnitContainer } from './unitcontainer';
import { Player } from './player';
import { Edge } from './edge';
import {
  TerritoryProperty,
  TerritoryAction,
  TerritoryActionDefinitions,
  propsToActions,
  propsToType,
  Status,
} from './values';
import { TerritoryModelAction } from './actions';

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

  get action() {
    const action = this.map.data.actions.find(
      (action) => action.type == 'territory' && action.territoryId == this.data.id
    ) as TerritoryModelAction;
    return action ?? null;
  }

  checkActionValid(action: TerritoryAction) {
    if (!this.player) throw new Error('setTerritoryAction on Territory without Player');

    if (action && !contains(this.actions, action))
      throw new Error(`Territory ${this.data.id} does not have Action ${action} available`);

    const actionDefinition = TerritoryActionDefinitions[action];

    let food = this.data.food;
    let gold = this.player.data.gold;

    if (food < actionDefinition.cost.food || gold < actionDefinition.cost.gold)
      throw new Error(`Territory ${this.data.id} cannot afford Action ${action}`);
  }

  resolveFood() {
    this.data.food += this.foodProduction;

    const consumedFood = sum(this.units.map((unit) => unit.foodConsumption));
    this.data.food -= consumedFood;
    for (let unit of this.units) {
      if (this.data.food < 0) unit.addStatus(Status.STARVE);
      else unit.removeStatus(Status.STARVE);
    }

    this.data.food = clamp(this.data.food, 0, this.maxFood);
  }

  resolveTerritoryAction() {
    if (this.action) {
      const actionDefinition = TerritoryActionDefinitions[this.action.action];

      // only apply the action if the player of that action still controls it
      // if the territory controller changes, stifle the effect of the action
      if (this.action.playerId == this.player.data.id) {
        actionDefinition.actionFunction(this.map, this);
      }

      this.map.removeAction(this.action);
    }
  }

  resolveTerritoryControl(previous: Territory) {
    const presentPlayerIds = unique(this.units.map((unit) => unit.data.playerId)).filter((id) => id != null);
    const previousPlayerIds = unique(previous.units.map((unit) => unit.data.playerId)).filter((id) => id != null);

    if (
      presentPlayerIds.length == 1 &&
      previousPlayerIds.length == 1 &&
      presentPlayerIds[0] === previousPlayerIds[0] &&
      presentPlayerIds[0] !== this.data.playerId
    ) {
      this.data.playerId = presentPlayerIds[0];
    }
  }
}

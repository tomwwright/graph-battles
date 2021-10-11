import { ID, include, exclude, contains, sum, clamp, unique } from './utils';
import { UnitContainer, UnitContainerData } from './unitcontainer';
import { Player } from './player';
import { Edge } from './edge';
import { Unit } from './unit';
import {
  TerritoryProperty,
  TerritoryAction,
  TerritoryActionDefinitions,
  propsToActions,
  propsToType,
  Status,
} from './values';

export type TerritoryData = UnitContainerData & {
  type: 'territory';
  edgeIds: ID[];
  playerId: ID;
  food: number;
  properties: TerritoryProperty[];
  currentAction: TerritoryAction;
};

export class Territory extends UnitContainer<TerritoryData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId] || null;
  }

  get units() {
    return this.data.unitIds.map((id) => <Unit>this.map.modelMap[id]);
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
      if (this.hasProperty(TerritoryProperty.CITY, TerritoryProperty.FORT)) {
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

  setTerritoryAction(action: TerritoryAction) {
    if (!this.player) throw new Error('setTerritoryAction on Territory without Player');

    if (action && !contains(this.actions, action))
      throw new Error(`Territory ${this.data.id} does not have Action ${action} available`);

    const currentAction = TerritoryActionDefinitions[this.data.currentAction];
    const newAction = TerritoryActionDefinitions[action];

    let food = this.data.food;
    let gold = this.player.data.gold;
    if (currentAction) {
      food += currentAction.cost.food;
      gold += currentAction.cost.gold;
    }
    const foodCost = newAction ? newAction.cost.food : 0;
    const goldCost = newAction ? newAction.cost.gold : 0;
    if (food < foodCost || gold < goldCost) throw new Error(`Territory ${this.data.id} cannot afford Action ${action}`);

    this.data.food = food - foodCost;
    this.player.data.gold = gold - goldCost;
    this.data.currentAction = action;
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
    if (this.data.currentAction != null) {
      const actionDefinition = TerritoryActionDefinitions[this.data.currentAction];
      actionDefinition.actionFunction(this.map, this);
      this.data.currentAction = null;
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
      if (this.player) this.player.data.territoryIds = exclude(this.player.data.territoryIds, this.data.id);
      this.data.playerId = presentPlayerIds[0];
      this.player.data.territoryIds = include(this.player.data.territoryIds, this.data.id);
      this.data.currentAction = null;
    }
  }
}

import { ID, clone, include, exclude } from "models/utils";
import GameMap from "models/map";
import UnitContainer, { UnitContainerData } from "models/unitcontainer";
import Player from "models/player";
import Edge from "models/edge";
import Unit from "models/unit";
import { TerritoryProperty, TerritoryAction, TerritoryActionDefinitions, TerritoryType } from "models/values";

export type TerritoryData = UnitContainerData & {
  edgeIds: ID[];
  playerId: ID;
  food: number;
  foodProduction: number;
  maxFood: number;
  goldProduction: number;
  properties: TerritoryProperty[];
  actions: TerritoryAction[];
  type: TerritoryType;
  currentAction: TerritoryAction;
};

export default class Territory extends UnitContainer<TerritoryData> {
  get player() {
    return <Player>this.map.modelMap[this.data.playerId];
  }

  get units() {
    return this.data.unitIds.map(id => <Unit>this.map.modelMap[id]);
  }

  get edges() {
    return this.data.edgeIds.map(id => <Edge>this.map.modelMap[id]);
  }

  addProperty(property: TerritoryProperty) {
    include(this.data.properties, property);
  }

  removeProperty(property: TerritoryProperty) {
    exclude(this.data.properties, property);
  }

  setTerritoryAction(action: TerritoryAction) {
    if (!this.player) throw new Error("setTerritoryAction on Territory without Player");

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
}

import { ID, Model, clone } from "models/utils";
import GameMap from "models/map";
import { UnitContainerData } from "models/unitcontainer";
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

export default class Territory extends Model<TerritoryData> {
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
    if (!this.data.properties.find(p => p === property)) this.data.properties.push(property);
  }

  setTerritoryAction(action: TerritoryAction) {
    if (!this.player) throw new Error("setTerritoryAction on Territory without Player");

    let food = this.data.food;
    let gold = this.player.data.gold;

    let currentAction = TerritoryActionDefinitions[this.data.currentAction];
    if (currentAction) {
      food += currentAction.cost.food;
      gold += currentAction.cost.gold;
    }

    let actionDef = TerritoryActionDefinitions[action];
    let foodCost = action ? actionDef.cost.food : 0;
    let goldCost = action ? actionDef.cost.gold : 0;

    if (food < foodCost || gold < goldCost) throw new Error("setTerritoryAction for Action that Player cannot afford");

    this.data.food = food - foodCost;
    this.player.data.gold = gold - goldCost;
    this.data.currentAction = action ? actionDef.action : null;
  }
}

export function setTerritoryAction(territory: Territory, action: TerritoryAction) {
  if (!territory.player) throw new Error("setTerritoryAction on Territory without Player");

  let food = territory.data.food;
  let gold = territory.player.data.gold;

  let currentAction = TerritoryActionDefinitions[territory.data.currentAction];
  if (currentAction) {
    food += currentAction.cost.food;
    gold += currentAction.cost.gold;
  }

  let actionDef = TerritoryActionDefinitions[action];
  let foodCost = action ? actionDef.cost.food : 0;
  let goldCost = action ? actionDef.cost.gold : 0;

  if (food < foodCost || gold < goldCost) throw new Error("setTerritoryAction for Action that Player cannot afford");

  territory.data.food = food - foodCost;
  territory.player.data.gold = gold - goldCost;
  territory.data.currentAction = action ? actionDef.action : null;
}

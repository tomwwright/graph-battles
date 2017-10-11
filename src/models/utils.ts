import GameMap from "models/map";

export type ID = string;

export type ModelMap = { [id: string]: Model };
export type DataMap = { [id: string]: HasID };

export type HasID = {
  id: ID;
};

export abstract class Model<T extends HasID = HasID> {
  data: T;
  map: GameMap;

  constructor(map: GameMap, data: T) {
    this.map = map;
    this.data = data;
  }
}

export function toID(id: number): string {
  return Number(id).toString(16);
}

export function mapIDs(...objects: Model[]): ModelMap {
  const map: ModelMap = {};
  objects.forEach(object => (map[object.data.id] = object));
  return map;
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function contains<T>(array: T[], thing: T): boolean {
  return array.indexOf(thing) !== -1;
}

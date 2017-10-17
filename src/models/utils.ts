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

export function intersection<T>(...arrays: T[][]): T[] {
  const compare = arrays.splice(0, 1)[0];
  return compare.filter(item => arrays.every(array => array.indexOf(item) !== -1));
}

export function include<T>(array: T[], thing: T): T[] {
  if (!contains(array, thing)) array.push(thing);
  return array;
}

export function exclude<T>(array: T[], thing: T): T[] {
  const index = array.indexOf(thing);
  if (index !== -1) array.splice(index, 1);
  return array;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((count, number) => count + number, 0);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function unique<T>(things: T[]): T[] {
  const uniqueThings = [];
  things.forEach(thing => {
    if (uniqueThings.indexOf(thing) === -1) uniqueThings.push(thing);
  });
  return uniqueThings;
}

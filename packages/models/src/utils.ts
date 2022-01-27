import { GameMap } from './map';

import { Colour } from './values';
import { EdgeData } from './edge';
import { PlayerData } from './player';
import { TerritoryData } from './territory';
import { UnitData } from './unit';
import { UserData } from './user';
import { AssertionError, deepEqual, deepStrictEqual } from 'assert';

export type ID = string;

export type ModelMap = { [id: string]: Model };
export type DataMap = { [id: string]: ModelData };

export type HasID = {
  id: ID;
  type: 'unit' | 'territory' | 'edge' | 'player' | 'map' | 'user';
};

export type ModelData = UnitData | TerritoryData | EdgeData | PlayerData | UserData;

export abstract class Model<T extends HasID = HasID> {
  data: T;
  map: GameMap;

  constructor(map: GameMap, data: T) {
    this.map = map;
    this.data = data;
  }
}

export function toID(id: number): string {
  return '#' + Number(id).toString(16);
}

export function mapIDs(...objects: Model[]): ModelMap {
  const map: ModelMap = {};
  objects.forEach((object) => (map[object.data.id] = object));
  return map;
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function contains<T>(array: T[], thing: T, isEqual: (a: T, b: T) => boolean = (a, b) => a == b): boolean {
  return array.find((a) => isEqual(a, thing)) !== undefined;
}

export function intersection<T>(...arrays: T[][]): T[] {
  const compare = arrays[0] || [];
  return compare.filter((item) => arrays.every((array) => array.indexOf(item) !== -1));
}

export function include<T>(array: T[], thing: T, isEqual: (a: T, b: T) => boolean = (a, b) => a == b): T[] {
  const copy = clone(array);
  if (!contains(copy, thing, isEqual)) copy.push(thing);
  return copy;
}

export function exclude<T>(array: T[], thing: T, isEqual: (a: T, b: T) => boolean = (a, b) => a == b): T[] {
  const copy = [];
  for (const a of array) {
    if (!isEqual(a, thing)) copy.push(a);
  }
  return copy;
}

export function excludeAll<T>(array: T[], things: T[]): T[] {
  const copy = [];
  for (const a of array) {
    if (!contains(things, a)) copy.push(a);
  }
  return copy;
}

export function flat<T>(arrays: (T | T[])[]): T[] {
  const flattened: T[] = [];
  const flatten = (elementOrArray: T | T[]) => {
    if (Array.isArray(elementOrArray)) elementOrArray.forEach((e) => flatten(e));
    else flattened.push(elementOrArray);
  };
  arrays.forEach((elementOrArray) => flatten(elementOrArray));
  return flattened;
}

export function collect<T>(...things: T[]): T[] {
  return things;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((count, number) => count + number, 0);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function unique<T>(things: T[]): T[] {
  const uniqueThings = [];
  things.forEach((thing) => {
    if (!contains(uniqueThings, thing)) uniqueThings.push(thing);
  });
  return uniqueThings;
}

export function toHexColour(colour: Colour) {
  return ('000000' + colour.toString(16)).substr(-6);
}

export function isEqual<T extends Object>(a: T, b: T) {
  try {
    deepStrictEqual(a, b);
    return true;
  } catch (e) {
    return !(e instanceof AssertionError);
  }
}

import { Territory } from "models/territory";
import { Unit } from "models/unit";
export type ID = string;

export type IDMap = { [id: string]: IDInstance };
export type DataMap = { [id: string]: HasID };

export type HasID = {
  id: ID;
};

export type IDInstance = {
  data: HasID;
};

export function toID(id: number): string {
  return Number(id).toString(16);
}

export function mapIDs(...objects: IDInstance[]): IDMap {
  const map: IDMap = {};
  objects.forEach(object => (map[object.data.id] = object));
  return map;
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

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

export class IDProvider {
  nextId: number = 0;

  constructor(id: number = 0) {
    this.nextId = id;
  }

  next(): ID {
    let id = "#" + Number(this.nextId).toString(16);
    this.nextId++;
    return id;
  }
}

export function mapIDs(...objects: IDInstance[]): IDMap {
  const map: IDMap = {};
  objects.forEach(object => (map[object.data.id] = object));
  return map;
}

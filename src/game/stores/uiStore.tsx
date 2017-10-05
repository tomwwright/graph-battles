import { observable } from "mobx";
import { Unit } from "models/unit";

export default class UiStore {
  @observable selectedUnitId: string;
}

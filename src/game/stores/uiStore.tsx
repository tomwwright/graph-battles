import { observable, action } from "mobx";
import { ID } from "models/utils";
import { Unit } from "models/unit";

export default class UiStore {
  @observable selectedId: ID;
  @observable selectedType: "unit" | "territory" | null;
  @observable isPhaserInitialised: boolean = false;
  @observable turn: number = 1;

  @action
  select(id: ID, type: "unit" | "territory" | null) {
    if (this.selectedId === id) {
      this.selectedId = null;
      this.selectedType = null;
    } else {
      this.selectedType = type;
      this.selectedId = id;
    }
  }

  @action
  selectTerritory(territoryId: ID) {
    this.select(territoryId, "territory");
  }

  @action
  selectUnit(unitId: ID) {
    this.select(unitId, "unit");
  }
}

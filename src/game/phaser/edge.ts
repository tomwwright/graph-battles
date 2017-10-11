import * as Phaser from "phaser-ce";
import RootStore from "game/stores";
import { ID } from "models/utils";
import Edge from "models/edge";

export default class EdgeView {
  modelId: ID;
  sprite: Phaser.Image;

  constructor(phaser: Phaser.Game, stores: RootStore, modelId: ID) {
    this.modelId = modelId;

    const model = stores.game.map.edge(modelId);

    const territoryViewA = stores.ui.territoryViews.get(model.territoryA.data.id);
    const territoryViewB = stores.ui.territoryViews.get(model.territoryB.data.id);

    const angle = Phaser.Math.angleBetween(
      territoryViewA.spriteGroup.x,
      territoryViewA.spriteGroup.y,
      territoryViewB.spriteGroup.x,
      territoryViewB.spriteGroup.y
    );
    const dist = Phaser.Math.distance(
      territoryViewA.spriteGroup.x,
      territoryViewA.spriteGroup.y,
      territoryViewB.spriteGroup.x,
      territoryViewB.spriteGroup.y
    );

    this.sprite = phaser.add.image(
      (territoryViewA.spriteGroup.x + territoryViewB.spriteGroup.x) / 2,
      (territoryViewA.spriteGroup.y + territoryViewB.spriteGroup.y) / 2,
      "line"
    );
    this.sprite.anchor.set(0.5);
    this.sprite.width = dist;
    this.sprite.angle = Phaser.Math.radToDeg(angle);
    this.sprite.sendToBack();
  }
}

import * as Phaser from 'phaser-ce';
import PhaserStore from 'game/stores/phaser';
import GameStore from 'game/stores/game';
import { ID, Edge } from '@battles/models';

export default class EdgeView {
  modelId: ID;
  sprite: Phaser.Image;

  constructor(phaserStore: PhaserStore, gameStore: GameStore, modelId: ID) {
    this.modelId = modelId;

    const model = gameStore.map.edge(modelId);

    const territoryViewA = phaserStore.territoryViews.get(model.territoryA.data.id);
    const territoryViewB = phaserStore.territoryViews.get(model.territoryB.data.id);

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

    this.sprite = phaserStore.phaser.add.image(
      (territoryViewA.spriteGroup.x + territoryViewB.spriteGroup.x) / 2,
      (territoryViewA.spriteGroup.y + territoryViewB.spriteGroup.y) / 2,
      'line'
    );
    this.sprite.anchor.set(0.5);
    this.sprite.width = dist;
    this.sprite.angle = Phaser.Math.radToDeg(angle);
    this.sprite.sendToBack();
  }
}

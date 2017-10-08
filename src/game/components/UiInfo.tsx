import * as React from "react";
import { inject, observer } from "mobx-react";
import { Card, Text } from "rebass";

import GameStore from "game/stores/gameStore";
import UiStore from "game/stores/uiStore";
import InfoPane from "game/components/InfoPane";
import UnitInfo from "game/components/UnitInfo";

type UiInfoProps = {
  game?: GameStore;
  ui?: UiStore;
};

const GameInfo: React.StatelessComponent<UiInfoProps> = ({ game, ui }) => (
  <div>
    <InfoPane>
      <Text>Phaser Initialised? {ui.isPhaserInitialised ? "Yes" : "No"}</Text>
    </InfoPane>
    {ui.selectedType === "unit" ? <UnitInfo unit={game.map.units.find(unit => unit.data.id == ui.selectedId)} /> : null}
  </div>
);

export default inject("game", "ui")(observer(GameInfo));

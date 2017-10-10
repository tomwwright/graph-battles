import * as React from "react";
import { inject, observer } from "mobx-react";
import { Card, Text } from "rebass";

import GameStore from "game/stores/game";
import UiStore from "game/stores/ui";
import InfoPane from "game/components/InfoPane";
import UnitInfo from "game/components/UnitInfo";
import TerritoryInfo from "game/components/TerritoryInfo";

type UiInfoProps = {
  game?: GameStore;
  ui?: UiStore;
};

const GameInfo: React.StatelessComponent<UiInfoProps> = ({ game, ui }) => (
  <div>
    <InfoPane>
      <Text>Phaser Initialised? {ui.isPhaserInitialised ? "Yes" : "No"}</Text>
      <Text>
        Selected: {ui.selectedType} {ui.selectedId}
      </Text>
    </InfoPane>
    {ui.selectedType === "unit" ? <UnitInfo unit={game.map.units.find(unit => unit.data.id == ui.selectedId)} /> : null}
    {ui.selectedType === "territory" ? (
      <TerritoryInfo
        territory={game.map.territories.find(territory => territory.data.id == ui.selectedId)}
        setTerritoryAction={action => game.setTerritoryAction(territory, action)}
      />
    ) : null}
  </div>
);

export default inject("game", "ui")(observer(GameInfo));

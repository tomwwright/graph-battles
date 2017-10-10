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

const GameInfo: React.StatelessComponent<UiInfoProps> = ({ game, ui }) => {
  let selectedComponents;
  if (ui.selected && ui.selected.type === "unit") {
    selectedComponents = ui.selected.ids.map((id, i) => <UnitInfo key={i} unit={game.map.unit(id)} />);
  } else if (ui.selected && ui.selected.type === "territory") {
    const territory = game.map.territory(ui.selected.id);
    selectedComponents = (
      <TerritoryInfo territory={territory} setTerritoryAction={action => game.setTerritoryAction(territory, action)} />
    );
  }
  return (
    <div>
      <InfoPane>
        <Text>Phaser Initialised? {ui.isPhaserInitialised ? "Yes" : "No"}</Text>
      </InfoPane>
      {selectedComponents}
    </div>
  );
};

export default inject("game", "ui")(observer(GameInfo));

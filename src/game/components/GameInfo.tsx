import * as React from "react";
import { inject, observer } from "mobx-react";
import GameStore from "game/stores/gameStore";
import UiStore from "game/stores/uiStore";
import UnitInfo from "game/components/UnitInfo";

type GameInfoProps = {
  game?: GameStore;
  ui?: UiStore;
};

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ game, ui }) => (
  <div>
    <p>Units: {game.map.units.length}</p>
    <p>Territories: {game.map.territories.length}</p>
    {ui.selectedUnitId ? <UnitInfo unit={game.map.units.find(unit => unit.data.id == ui.selectedUnitId)} /> : null}
  </div>
);

export default inject("game", "ui")(observer(GameInfo));

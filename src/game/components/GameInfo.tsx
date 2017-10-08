import * as React from "react";
import { inject, observer } from "mobx-react";
import { Card, Text } from "rebass";

import GameStore from "game/stores/game";
import InfoPane from "game/components/InfoPane";
import UnitInfo from "game/components/UnitInfo";

type GameInfoProps = {
  game?: GameStore;
};

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ game }) => (
  <div>
    <InfoPane>
      <Text>Units: {game.map.units.length}</Text>
      <Text>Territories: {game.map.territories.length}</Text>
    </InfoPane>
  </div>
);

export default inject("game")(observer(GameInfo));

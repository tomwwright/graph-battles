import * as React from 'react';
import { inject, observer } from 'mobx-react';
import GameStore from 'game/stores/gameStore';


type GameInfoProps = {
  game?: GameStore
}

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ game }) => (
  <div>
    <p>Units: {game.map.units.length}</p>
    <p>Territories: {game.map.territories.length}</p>
  </div>
);

export default inject('game')(observer(GameInfo));
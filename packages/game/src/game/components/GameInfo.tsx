import * as React from 'react';
import { inject, observer } from 'mobx-react';
import Styled from 'styled-components';
import { Card, Text, Button, Fixed, Overlay, Heading } from 'rebass';

import GameStore from 'game/stores/game';
import UiStore, { TurnState } from 'game/stores/ui';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import CombatInfo from 'game/components/CombatInfo';
import TurnSelect from 'game/components/TurnSelect';
import ResolveInfo from 'game/components/ResolveInfo';
import { VictoryPopup } from 'game/components/VictoryPopup';
import { NextPlayerPopup } from 'game/components/NextPlayerPopup';

import Combat from 'models/combat';
import { ColourStrings } from 'models/values';

type GameInfoProps = {
  gameStore?: GameStore;
  uiStore?: UiStore;
};

const Span = Styled.span`
  color: ${props => props.color}
`;

const GameInfo: React.StatelessComponent<GameInfoProps> = ({ gameStore, uiStore }) => (
  <div>
    <TurnSelect
      currentTurn={gameStore.turn}
      numTurns={gameStore.game.data.maps.length}
      onClick={(turn: number) => uiStore.setTurn(turn)}
    />
    <Button onClick={() => uiStore.phaserStore.centreCamera()}>Reset Camera</Button>
    {gameStore.map.players.map((player, i) => (
      <PlayerInfo key={i} player={player} isActive={gameStore.currentPlayerId === player.data.id} />
    ))}
    {uiStore.turnState === TurnState.VICTORY && (
      <VictoryPopup winners={gameStore.game.winners} turn={gameStore.game.turn} onClick={() => uiStore.onClickReplayVictory()} />
    )}
    {uiStore.turnState === TurnState.NEXT_PLAYER && (
      <NextPlayerPopup player={gameStore.currentPlayer} turn={gameStore.game.turn} maxTurns={gameStore.game.data.maxTurns} onClick={() => uiStore.onClickNextPlayerGo()} />
    )}
    {uiStore.turnState === TurnState.REPLAYING && <ResolveInfo gameStore={gameStore} uiStore={uiStore} />}
    {uiStore.turnState === TurnState.PLANNING && gameStore.currentPlayerId != null && (
      <Button onClick={() => uiStore.onClickReady()} bg="green">
        Ready!
      </Button>
    )}
  </div>
);

export default inject('gameStore', 'uiStore')(observer(GameInfo));

import * as React from 'react';
import { inject, observer } from 'mobx-react';
import Styled, { StyledFunction } from 'styled-components';
import { Card, Text, Button, Fixed, Overlay, Heading } from 'rebass';

import GameStore from 'game/stores/game';
import UiStore, { TurnState } from 'game/stores/ui';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import CombatInfo from 'game/components/CombatInfo';
import TurnSelect from 'game/components/TurnSelect';

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
    <TurnSelect currentTurn={uiStore.turn} numTurns={gameStore.game.data.maps.length} onClick={(turn: number) => uiStore.setTurn(turn)} />
    {gameStore.map.players.map((player, i) => (
      <PlayerInfo key={i} player={player} isActive={gameStore.currentPlayerId === player.data.id} />
    ))}
    {uiStore.turnState === TurnState.NEXT_PLAYER && (
      <div>
        <Fixed top right bottom left />
        <Overlay>
          <Heading>Turn {uiStore.turn}/{gameStore.game.data.maxTurns}</Heading>
          <Text><Span color={ColourStrings[gameStore.currentPlayer.data.colour]}>Player {gameStore.currentPlayer.data.id}</Span> you're up!</Text>
          <Button onClick={() => uiStore.onClickNextPlayerGo()}>Go</Button>
        </Overlay>
      </div>
    )}
    {uiStore.turnState === TurnState.MOVE && (
      <Button onClick={() => uiStore.onClickResolveMoves()}>Resolve Moves</Button>
    )}
    {uiStore.turnState === TurnState.COMBAT && (
      gameStore.combats.map((combat, i) => (
        <CombatInfo
          key={i}
          combat={combat}
          onClick={(combat: Combat) => uiStore.onClickResolveCombat(combat.location.data.id)}
        />
      ))
    )}
    {uiStore.turnState === TurnState.POST_REPLAY && (
      <Button onClick={() => uiStore.setTurn(uiStore.turn + 1)}>Next Turn</Button>
    )}
    {uiStore.turnState === TurnState.PLAN && (
      <Button onClick={() => uiStore.onClickReady()} bg='green'>Ready!</Button>
    )}
  </div>
);

export default inject('gameStore', 'uiStore')(observer(GameInfo));

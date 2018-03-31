import * as React from 'react';
import { Small, Text, Button } from 'rebass';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import TerritoryInfo from 'game/components/TerritoryInfo';
import CombatInfo from 'game/components/CombatInfo';
import UnitListItem from 'game/components/UnitListItem';
import PlayerListItem from 'game/components/PlayerListItem';
import CombatListItem from 'game/components/CombatListItem';
import TerritoryListItem from 'game/components/TerritoryListItem';

import GameStore, { ResolveState } from 'game/stores/game';

import UiStore from 'game/stores/ui';

type ResolveInfoProps = {
  gameStore: GameStore;
  uiStore: UiStore;
};

const ResolveInfo: React.StatelessComponent<ResolveInfoProps> = ({ gameStore, uiStore }) => {
  const resolveStateTexts = {
    [ResolveState.ADD_DEFEND]: 'Defenders',
    [ResolveState.COMBATS]: 'Combats',
    [ResolveState.EDGE_MOVES]: 'Movement',
    [ResolveState.MOVES]: 'Movement',
    [ResolveState.FOOD]: 'Food',
    [ResolveState.GOLD]: 'Gold',
    [ResolveState.TERRITORY_ACTIONS]: 'Territory Actions',
    [ResolveState.TERRITORY_CONTROL]: 'Territory Captures',
    [ResolveState.NONE]: '---',
  };

  return (
    <div>
      <InfoPane>
        <Text>
          <Small>Replaying</Small>
        </Text>
        <Text>{resolveStateTexts[gameStore.resolveState]}</Text>
        <Button onClick={() => uiStore.onClickResolve(gameStore.resolveIds[0])}>Resolve Next</Button>
      </InfoPane>

      {gameStore.resolveIds.map((id, i) => {
        if (i == 0) {
          switch (gameStore.resolveState) {
            case ResolveState.ADD_DEFEND:
            case ResolveState.EDGE_MOVES:
            case ResolveState.MOVES:
              return <UnitInfo key={i} unit={gameStore.map.unit(id)} isPlanning={false} />;
            case ResolveState.FOOD:
            case ResolveState.TERRITORY_ACTIONS:
            case ResolveState.TERRITORY_CONTROL:
              return (
                <TerritoryInfo
                  key={i}
                  territory={gameStore.map.territory(id)}
                  currentPlayer={gameStore.currentPlayer}
                  isPlanning={false}
                />
              );
            case ResolveState.GOLD:
              return <PlayerInfo key={i} player={gameStore.map.player(id)} isActive={false} />;
            case ResolveState.COMBATS:
              return <CombatInfo key={i} combat={gameStore.combats.find(combat => combat.location.data.id === id)} />;
          }
        } else {
          switch (gameStore.resolveState) {
            case ResolveState.ADD_DEFEND:
            case ResolveState.EDGE_MOVES:
            case ResolveState.MOVES:
              return <UnitListItem key={i} unit={gameStore.map.unit(id)} />;
            case ResolveState.FOOD:
            case ResolveState.TERRITORY_ACTIONS:
            case ResolveState.TERRITORY_CONTROL:
              return <TerritoryListItem key={i} territory={gameStore.map.territory(id)} />;
            case ResolveState.GOLD:
              return <PlayerListItem key={i} player={gameStore.map.player(id)} />;
            case ResolveState.COMBATS:
              return (
                <CombatListItem key={i} combat={gameStore.combats.find(combat => combat.location.data.id === id)} />
              );
          }
        }
      })}
    </div>
  );
};

export default ResolveInfo;

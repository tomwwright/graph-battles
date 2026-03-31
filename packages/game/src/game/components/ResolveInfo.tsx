import * as React from 'react';
import { Small, Text, Button } from 'rebass';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import PlayerInfo from 'game/components/PlayerInfo';
import TerritoryInfo from 'game/components/TerritoryInfo';
import CombatInfo from 'game/components/CombatInfo';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';

type ResolveInfoProps = {
  gameStore: GameStore;
  uiStore: UiStore;
};

const phaseText: Record<string, string> = {
  move: 'Movement',
  combat: 'Combat',
  'add-defend': 'Defenders',
  food: 'Food',
  gold: 'Gold',
  'territory-control': 'Territory Captures',
  'territory-action': 'Territory Actions',
};

const ResolveInfo: React.StatelessComponent<ResolveInfoProps> = ({ gameStore, uiStore }) => {
  const resolution = gameStore.currentResolution;

  const renderDetail = () => {
    if (!resolution) return null;

    switch (resolution.phase) {
      case 'move':
      case 'add-defend':
        return <UnitInfo unit={gameStore.map.unit(resolution.unitId)} isPlanning={false} />;
      case 'combat':
        return <CombatInfo combat={gameStore.combats.find((c) => c.location.data.id === resolution.locationId)} />;
      case 'food':
      case 'territory-control':
      case 'territory-action':
        return (
          <TerritoryInfo
            territory={gameStore.map.territory(resolution.territoryId)}
            currentPlayer={gameStore.currentPlayer}
            isPlanning={false}
          />
        );
      case 'gold':
        const user = gameStore.game.users.find((user) =>
          user.players.map((player) => player.data.id).includes(resolution.playerId)
        );
        return <PlayerInfo player={gameStore.map.player(resolution.playerId)} user={user} isActive={false} />;
    }
  };

  return (
    <div>
      <InfoPane>
        <Text>
          <Small>Replaying</Small>
        </Text>
        <Text>{resolution ? phaseText[resolution.phase] : '---'}</Text>
        <Button onClick={() => uiStore.onClickResolveNext()}>Resolve Next</Button>
      </InfoPane>

      {renderDetail()}
    </div>
  );
};

export default ResolveInfo;

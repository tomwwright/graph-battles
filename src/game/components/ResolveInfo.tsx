import * as React from 'react';
import { Small, Text, Button } from 'rebass';
import InfoPane from 'game/components/InfoPane';
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
  return (
    <div>
      <InfoPane>
        <Text>
          Resolving: {gameStore.resolveState}
        </Text>
      </InfoPane>

      {gameStore.resolveIds.map((id, i) => {
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
            return <PlayerListItem key={i} player={gameStore.map.player(id)} />
          case ResolveState.COMBATS:
            return <CombatListItem key={i} combat={gameStore.combats.find(combat => combat.location.data.id === id)} />
        }
      })}

      <Button onClick={() => uiStore.onClickResolve(gameStore.resolveIds[0])}>Resolve</Button>
    </div>
  );
};

export default ResolveInfo;
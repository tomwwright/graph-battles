import * as React from 'react';
import { Small, Text, Button } from 'rebass';
import InfoPane from 'game/components/InfoPane';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';

import Player from 'models/player';
import { TerritoryAction, TerritoryActionDefinitions, ColourStrings } from 'models/values';

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
        <Small>
          {gameStore.resolveIds.map((id, i) => <Text key={i}>ID {id}</Text>)}
        </Small>
      </InfoPane>
      <Button onClick={() => uiStore.onClickResolve(gameStore.resolveIds[0])}>Resolve</Button>
    </div>
  );
};

export default ResolveInfo;
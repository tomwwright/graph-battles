import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Card, Text } from 'rebass';

import GameStore from 'game/stores/game';
import UiStore from 'game/stores/ui';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import TerritoryInfo from 'game/components/TerritoryInfo';

type UiInfoProps = {
  gameStore?: GameStore;
  uiStore?: UiStore;
};

const GameInfo: React.StatelessComponent<UiInfoProps> = ({ gameStore, uiStore }) => {
  let selectedComponents;
  if (uiStore.selected && uiStore.selected.type === 'unit') {
    selectedComponents = uiStore.selected.ids.map((id, i) => (
      <UnitInfo key={i} unit={gameStore.map.unit(id)} onCancelMoveClick={() => gameStore.onMoveUnits([id], null)} />
    ));
  } else if (uiStore.selected && uiStore.selected.type === 'territory') {
    const territory = gameStore.map.territory(uiStore.selected.id);
    selectedComponents = (
      <TerritoryInfo
        territory={territory}
        setTerritoryAction={action => gameStore.onTerritoryAction(territory, action)}
      />
    );
  }
  return (
    <div>
      <InfoPane>
        <Text>Phaser Initialised? {uiStore.isPhaserInitialised ? 'Yes' : 'No'}</Text>
      </InfoPane>
      {selectedComponents}
    </div>
  );
};

export default inject('gameStore', 'uiStore')(observer(GameInfo));

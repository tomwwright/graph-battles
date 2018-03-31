import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Card, Text } from 'rebass';

import GameStore from 'game/stores/game';
import UiStore, { TurnState } from 'game/stores/ui';
import InfoPane from 'game/components/InfoPane';
import UnitInfo from 'game/components/UnitInfo';
import TerritoryInfo from 'game/components/TerritoryInfo';

type SelectedInfoProps = {
  gameStore?: GameStore;
  uiStore?: UiStore;
};

const SelectedInfo: React.StatelessComponent<SelectedInfoProps> = ({ gameStore, uiStore }) => {
  let selectedComponents;
  if (uiStore.selected && uiStore.selected.type === 'unit') {
    selectedComponents = uiStore.selected.ids.map((id, i) => (
      <UnitInfo key={i}
        unit={gameStore.map.unit(id)}
        isPlanning={uiStore.turnState === TurnState.PLANNING}
        onCancelMoveClick={() => gameStore.onMoveUnits([id], null)} />
    ));
  } else if (uiStore.selected && uiStore.selected.type === 'territory') {
    const territory = gameStore.map.territory(uiStore.selected.id);
    selectedComponents = (
      <TerritoryInfo
        territory={territory}
        currentPlayer={gameStore.currentPlayer}
        isPlanning={uiStore.turnState === TurnState.PLANNING}
        setTerritoryAction={action => gameStore.onTerritoryAction(territory, action)}
      />
    );
  }
  return (
    <div>
      {selectedComponents}
    </div>
  );
};

export default inject('gameStore', 'uiStore')(observer(SelectedInfo));

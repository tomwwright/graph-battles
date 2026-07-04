import { useState } from 'react';
import { Frame, Header, LeftColumn, RightColumn, SelectedSlot, Footer } from './components/Frame';
import { TurnSelector } from './components/TurnSelector';
import { PlayerLeaderboard } from './components/PlayerLeaderboard';
import { GameSettingsPanel } from './components/GameSettingsPanel';
import { ActionBar } from './components/ActionBar';
import { SelectedInfoPanel } from './components/SelectedInfoPanel';
import { ResolutionPanel } from './components/ResolutionPanel';
import { NextPlayerPopup } from './components/NextPlayerPopup';
import { VictoryPopup } from './components/VictoryPopup';
import { Tooltip } from './components/Tooltip';
import { HeaderBar } from './components/HeaderBar';
import { MarkerLayer } from './components/MarkerLayer';
import { TerritoriesModal } from './components/TerritoriesModal';
import { ReplayPhaseList } from './components/ReplayPhaseList';

export function App() {
  const [territoriesOpen, setTerritoriesOpen] = useState(false);

  return (
    <Frame>
      <Header>
        <HeaderBar />
      </Header>
      <LeftColumn>
        <PlayerLeaderboard onOpenTerritories={() => setTerritoriesOpen(true)} />
        <button
          type="button"
          onClick={() => setTerritoriesOpen(true)}
          style={{ pointerEvents: 'auto', marginTop: 8 }}
        >
          Territories
        </button>
        <ReplayPhaseList />
      </LeftColumn>
      <RightColumn>
        <GameSettingsPanel />
        <SelectedSlot>
          <ResolutionPanel />
          <SelectedInfoPanel />
        </SelectedSlot>
      </RightColumn>
      <Footer>
        <TurnSelector />
        <ActionBar />
      </Footer>
      <MarkerLayer />
      <NextPlayerPopup />
      <VictoryPopup />
      <Tooltip />
      <TerritoriesModal
        isOpen={territoriesOpen}
        onDismiss={() => setTerritoriesOpen(false)}
      />
    </Frame>
  );
}

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
import { ModalContainer, type OpenModal } from './components/ModalContainer';
import { ReplayPhaseList } from './components/ReplayPhaseList';

export function App() {
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  return (
    <Frame>
      <Header>
        <HeaderBar />
      </Header>
      <LeftColumn>
        <PlayerLeaderboard onOpenTerritories={() => setOpenModal('territories')} />
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', marginTop: 8 }}>
          <button type="button" onClick={() => setOpenModal('territories')}>
            Territories
          </button>
          <button type="button" onClick={() => setOpenModal('units')}>
            Units
          </button>
        </div>
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
      <ModalContainer
        open={openModal}
        onDismiss={() => setOpenModal(null)}
        onSwitch={(target) => setOpenModal(target)}
      />
    </Frame>
  );
}

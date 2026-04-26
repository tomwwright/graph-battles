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
import { FpsCounter } from './components/FpsCounter';

export function App() {
  return (
    <Frame>
      <Header>
        <TurnSelector />
      </Header>
      <LeftColumn>
        <PlayerLeaderboard />
      </LeftColumn>
      <RightColumn>
        <GameSettingsPanel />
        <SelectedSlot>
          <ResolutionPanel />
          <SelectedInfoPanel />
        </SelectedSlot>
      </RightColumn>
      <Footer>
        <FpsCounter />
        <ActionBar />
      </Footer>
      <NextPlayerPopup />
      <VictoryPopup />
      <Tooltip />
    </Frame>
  );
}

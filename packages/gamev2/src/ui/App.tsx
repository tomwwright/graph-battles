import { Frame, Header, SidebarContainer, Sidebar, Footer } from './components/Frame';
import { GameInfoPanel } from './components/GameInfoPanel';
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
      </Header>
      <SidebarContainer>
        <Sidebar>
          <GameInfoPanel />
          <ResolutionPanel />
        </Sidebar>
        <Sidebar>
          <SelectedInfoPanel />
        </Sidebar>
      </SidebarContainer>
      <Footer>
        <FpsCounter />
      </Footer>
      <NextPlayerPopup />
      <VictoryPopup />
      <Tooltip />
    </Frame>
  );
}

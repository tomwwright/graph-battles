import * as React from 'react';
import SelectedInfo from 'game/components/SelectedInfo';
import GameInfo from 'game/components/GameInfo';

const Root: React.StatelessComponent<{}> = () => (
  <div>
    <div style={{ position: 'absolute', left: 0, top: 0, margin: '8px', padding: 0 }}>
      <GameInfo />
    </div>
    <div style={{ position: 'absolute', right: 0, top: 0, margin: '8px', padding: 0 }}>
      <SelectedInfo />
    </div>
  </div>
);

export default Root;

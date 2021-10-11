import * as React from "react";
import SelectedInfo from "game/components/SelectedInfo";
import GameInfo from "game/components/GameInfo";

const Root: React.StatelessComponent<{}> = () => (
  <div>
    <GameInfo />
    <SelectedInfo />
  </div>
);

export default Root;

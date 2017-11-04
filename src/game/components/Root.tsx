import * as React from "react";
import UiInfo from "game/components/UiInfo";
import GameInfo from "game/components/GameInfo";

const Root: React.StatelessComponent<{}> = () => (
  <div>
    <GameInfo />
    <UiInfo />
  </div>
);

export default Root;

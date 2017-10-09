import * as React from "react";
import { Small, Text } from "rebass";
import InfoPane from "game/components/InfoPane";
import { TerritoryActionTexts } from "game/constants";
import { TerritoryAction, TerritoryActionDefinitions } from "models/values";

type TerritoryActionProps = {
  action: TerritoryAction;
};

const TerritoryActionComponent: React.StatelessComponent<TerritoryActionProps> = ({ action }) => {
  const definition = TerritoryActionDefinitions[action];
  const text = TerritoryActionTexts[action];
  return (
    <InfoPane>
      <Text>{text}</Text>
      <Small>
        <Text>
          Food {definition.cost.food}, Gold {definition.cost.gold}
        </Text>
      </Small>
    </InfoPane>
  );
};

export default TerritoryActionComponent;

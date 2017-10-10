import * as React from "react";
import { Small, Text, Row, Column, Button } from "rebass";
import InfoPane from "game/components/InfoPane";
import { TerritoryActionTexts } from "game/constants";
import { TerritoryAction, TerritoryActionDefinitions } from "models/values";

type TerritoryActionProps = {
  action: TerritoryAction;
  isAvailable: boolean;
  isSelected: boolean;
  onClick: (action: TerritoryAction) => void;
};

const TerritoryActionComponent: React.StatelessComponent<TerritoryActionProps> = ({
  action,
  isAvailable,
  isSelected,
  onClick
}) => {
  const definition = TerritoryActionDefinitions[action];
  const text = TerritoryActionTexts[action];
  return (
    <InfoPane>
      <Row>
        <Column>
          <Text>{text}</Text>
          <Small>
            <Text>
              Food {definition.cost.food}, Gold {definition.cost.gold}
            </Text>
          </Small>
        </Column>
        <Column>
          <Button onClick={() => onClick(isSelected ? null : action)} disabled={!isAvailable}>
            {isSelected ? "Unbuy" : "Buy"}
          </Button>
        </Column>
      </Row>
    </InfoPane>
  );
};

export default TerritoryActionComponent;

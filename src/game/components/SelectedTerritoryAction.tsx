import * as React from "react";
import { Small, Text, Row, Column, Button } from "rebass";
import InfoPane from "game/components/InfoPane";
import Territory from "models/territory";
import { TerritoryActionTexts } from "game/constants";
import { TerritoryAction, TerritoryActionDefinitions } from "models/values";

type TerritoryActionProps = {
  action: TerritoryAction;
  onClickUnbuy?: (action: TerritoryAction) => void;
};

const SelectedTerritoryActionComponent: React.StatelessComponent<TerritoryActionProps> = ({
  action,
  onClickUnbuy
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
        {onClickUnbuy &&
          <Column>
            <Button onClick={() => onClickUnbuy(null)}>Unbuy</Button>
          </Column>}
      </Row>
    </InfoPane>
  );
};

export default SelectedTerritoryActionComponent;

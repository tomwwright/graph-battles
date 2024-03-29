import * as React from "react";
import { Small, Text, Row, Column, Button } from "rebass";
import InfoPane from "game/components/InfoPane";
import { TerritoryActionTexts } from "game/constants";
import { Territory, Values } from "@battles/models";

type TerritoryActionProps = {
  action: Values.TerritoryAction;
  territory: Territory;
  onClickBuy?: (action: Values.TerritoryAction) => void;
};

const TerritoryActionComponent: React.StatelessComponent<TerritoryActionProps> = ({
  action,
  territory,
  onClickBuy
}) => {
  const definition = Values.TerritoryActionDefinitions[action];
  const text = TerritoryActionTexts[action];
  const playerCanAfford = territory.player && territory.player.data.gold >= definition.cost.gold && territory.data.food >= definition.cost.food;
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
        {onClickBuy && <Column>
          <Button onClick={() => onClickBuy(action)} disabled={!playerCanAfford}>Buy</Button>
        </Column>}
      </Row>
    </InfoPane>
  );
};

export default TerritoryActionComponent;

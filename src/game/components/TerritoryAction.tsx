import * as React from "react";
import { Small, Text, Row, Column, Button } from "rebass";
import InfoPane from "game/components/InfoPane";
import Territory from "models/territory";
import { TerritoryActionTexts } from "game/constants";
import { TerritoryAction, TerritoryActionDefinitions } from "models/values";

type TerritoryActionProps = {
  action: TerritoryAction;
  territory: Territory;
  onClick: (action: TerritoryAction) => void;
};

const TerritoryActionComponent: React.StatelessComponent<TerritoryActionProps> = ({
  action,
  territory,
  onClick
}) => {
  const definition = TerritoryActionDefinitions[action];
  const text = TerritoryActionTexts[action];
  const isSelected = action === territory.data.currentAction;
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
        <Column>
          {isSelected ?
            <SelectedActionButton onClick={() => onClick(null)} />
            :
            <SelectActionButton onClick={() => onClick(action)} isAvailable={territory.data.currentAction === null && playerCanAfford} />
          }
        </Column>
      </Row>
    </InfoPane>
  );
};

type SelectedActionButtonProps = {
  onClick: () => void;
};

const SelectedActionButton: React.StatelessComponent<SelectedActionButtonProps> = (props) => (
  <Button onClick={props.onClick}>Unbuy</Button>
);

type SelectActionButtonProps = {
  onClick: () => void;
  isAvailable: boolean;
};

const SelectActionButton: React.StatelessComponent<SelectActionButtonProps> = (props) => (
  <Button onClick={props.onClick} disabled={!props.isAvailable}>Buy</Button>
);

export default TerritoryActionComponent;

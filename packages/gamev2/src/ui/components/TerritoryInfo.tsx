import { Territory, Player, Values } from '@battles/models';
import panelStyles from './panels.module.css';

const TERRITORY_ACTION_LABELS: Record<string, string> = {
  [Values.TerritoryAction.CREATE_UNIT]: 'Create Unit',
  [Values.TerritoryAction.BUILD_SETTLEMENT]: 'Build Settlement',
  [Values.TerritoryAction.BUILD_FARM]: 'Build Farm',
  [Values.TerritoryAction.BUILD_CITY]: 'Build City',
  [Values.TerritoryAction.BUILD_FORT]: 'Build Fort',
  [Values.TerritoryAction.BUILD_CASTLE]: 'Build Castle',
};

type TerritoryInfoProps = {
  territory: Territory;
  currentPlayer: Player | null;
  isPlanning: boolean;
  onTerritoryAction?: (action: Values.TerritoryAction) => void;
  onCancelTerritoryAction?: () => void;
};

export function TerritoryInfo({
  territory,
  currentPlayer,
  isPlanning,
  onTerritoryAction,
  onCancelTerritoryAction,
}: TerritoryInfoProps) {
  const colour = territory.player ? Values.ColourStrings[territory.player.data.colour] : 'gray';
  const isOwnedByCurrentPlayer = currentPlayer != null && territory.data.playerId === currentPlayer.data.id;
  const currentAction = territory.currentAction;

  const computeAffordability = (action: Values.TerritoryAction) => {
    const def = Values.TerritoryActionDefinitions[action];
    const foodCost = def.cost.food;
    const goldCost = def.cost.gold;
    if (!currentPlayer) return { affordable: false, foodCost, goldCost };

    let availableFood = territory.data.food;
    let availableGold = currentPlayer.data.gold;
    if (currentAction != null) {
      const currentDef = Values.TerritoryActionDefinitions[currentAction];
      availableFood += currentDef.cost.food;
      availableGold += currentDef.cost.gold;
    }
    return {
      affordable: availableFood >= foodCost && availableGold >= goldCost,
      foodCost,
      goldCost,
    };
  };

  const availableActions =
    isOwnedByCurrentPlayer && isPlanning
      ? Values.propsToActions(territory.data.properties)
      : [];

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.heading}>
        Territory {territory.data.id}{' '}
        <span className={panelStyles.colourSwatch} style={{ backgroundColor: colour }} />
        <span style={{ color: colour, marginLeft: 4 }}>
          {territory.player ? `Player ${territory.data.playerId}` : 'No player'}
        </span>
      </div>

      <div className={panelStyles.small}>
        Food {territory.data.food}/{territory.maxFood} (+{territory.foodProduction})
      </div>
      <div className={panelStyles.small}>Gold +{territory.goldProduction}</div>

      {currentAction != null && (
        <>
          <hr className={panelStyles.divider} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={panelStyles.small}>
              Pending: {TERRITORY_ACTION_LABELS[currentAction]}
            </span>
            {isOwnedByCurrentPlayer && isPlanning && onCancelTerritoryAction && (
              <button
                className={panelStyles.buttonDanger}
                onClick={onCancelTerritoryAction}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {availableActions.length > 0 && onTerritoryAction && (
        <>
          <hr className={panelStyles.divider} />
          <div className={panelStyles.heading}>Actions</div>
          {availableActions.map((action) => {
            const { affordable, foodCost, goldCost } = computeAffordability(action);
            const isCurrent = currentAction === action;
            return (
              <div key={action} style={{ marginBottom: 2 }}>
                <button
                  className={isCurrent ? panelStyles.buttonActive : panelStyles.button}
                  disabled={!affordable && !isCurrent}
                  onClick={() => onTerritoryAction(action)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  {TERRITORY_ACTION_LABELS[action]} ({foodCost}f / {goldCost}g)
                  {isCurrent && ' \u2713'}
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Values } from '@battles/models';
import { DismissableModal } from './DismissableModal';
import { Table, type Column } from './Table';
import { TERRITORY_ACTION_LABELS } from './TerritoryInfo';
import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import panelStyles from './panels.module.css';

type TerritoryRow = {
  id: string;
  ownerId: string | null;
  ownerColour: string;
  food: number;
  maxFood: number;
  foodProduction: number;
  goldProduction: number;
  unitCount: number;
  availableActions: number;
  currentAction: Values.TerritoryAction | null;
};

type TerritoriesModalProps = {
  isOpen: boolean;
  onDismiss: () => void;
  onSwitch?: () => void;
};

export function TerritoriesModal({ isOpen, onDismiss, onSwitch }: TerritoriesModalProps) {
  const map = useGameStore((s) => s.map);
  const phase = useGameStore((s) => s.phase);
  const mapRevision = useGameStore((s) => s.mapRevision);
  const dispatch = useDispatch();
  const isPlanning = phase.type === 'planning';

  const rows = useMemo<TerritoryRow[]>(
    () =>
      map.territories.map((t) => ({
        id: t.data.id,
        ownerId: t.player?.data.id ?? null,
        ownerColour: Values.ColourStrings[t.player?.data.colour] ?? 'grey',
        food: t.data.food,
        maxFood: t.maxFood,
        foodProduction: t.foodProduction,
        goldProduction: t.goldProduction,
        unitCount: t.units.length,
        availableActions: t.actions.length,
        currentAction: t.currentAction,
      })),
    [map, phase, mapRevision],
  );

  const columns = useMemo<Column<TerritoryRow>[]>(
    () => [
      {
        key: 'owner',
        header: '',
        width: '18px',
        render: (r) => (
          <span
            title={r.ownerId ?? 'Uncontrolled'}
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: 2,
              background: r.ownerColour,
              border: '1px solid rgba(255,255,255,0.3)',
              verticalAlign: 'middle',
            }}
          />
        ),
        sortValue: (r) => r.ownerId ?? '',
      },
      {
        key: 'id',
        header: 'Territory',
        render: (r) => (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              dispatch({ type: 'focus', id: r.id });
            }}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              textShadow: 'inherit',
              color: 'inherit',
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            {r.id}
          </button>
        ),
        sortValue: (r) => r.id,
      },
      {
        key: 'player',
        header: 'Player',
        render: (r) => (
          <span style={{ color: r.ownerId ? r.ownerColour : 'inherit' }}>
            {r.ownerId ?? '—'}
          </span>
        ),
        sortValue: (r) => r.ownerId ?? '',
      },
      {
        key: 'food',
        header: 'Food',
        align: 'right',
        render: (r) => `${r.food}/${r.maxFood}`,
        sortValue: (r) => r.food,
      },
      {
        key: 'foodProd',
        header: 'Food +',
        align: 'right',
        render: (r) => {
          if (r.unitCount === 0) return `+${r.foodProduction}`;
          const delta = r.foodProduction - r.unitCount;
          const sign = delta >= 0 ? '+' : '';
          return `+${r.foodProduction} (${sign}${delta})`;
        },
        sortValue: (r) => r.foodProduction,
      },
      {
        key: 'goldProd',
        header: 'Gold +',
        align: 'right',
        render: (r) => `+${r.goldProduction}`,
        sortValue: (r) => r.goldProduction,
      },
      {
        key: 'units',
        header: 'Units',
        align: 'right',
        render: (r) => `${r.unitCount} units`,
        sortValue: (r) => r.unitCount,
      },
      {
        key: 'upgrades',
        header: 'Upgrades',
        align: 'right',
        render: (r) => `${r.availableActions} available`,
        sortValue: (r) => r.availableActions,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (r) =>
          r.currentAction == null ? null : (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span>{TERRITORY_ACTION_LABELS[r.currentAction] ?? r.currentAction}</span>
              <button
                type="button"
                disabled={!isPlanning}
                onClick={() =>
                  dispatch({ type: 'territory-action', territoryId: r.id, action: null })
                }
              >
                Cancel
              </button>
            </span>
          ),
      },
    ],
    [dispatch, isPlanning, onDismiss],
  );

  const title = onSwitch ? (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span>Territories</span>
      <button type="button" className={panelStyles.button} onClick={onSwitch}>
        Switch to Units →
      </button>
    </span>
  ) : (
    'Territories'
  );

  return (
    <DismissableModal isOpen={isOpen} onDismiss={onDismiss} title={title}>
      <Table
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        defaultSort={{ key: 'id', direction: 'asc' }}
        emptyState="No territories."
      />
    </DismissableModal>
  );
}

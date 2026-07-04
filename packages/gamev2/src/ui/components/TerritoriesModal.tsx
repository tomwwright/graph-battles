import { useMemo } from 'react';
import { Values } from '@battles/models';
import { DismissableModal } from './DismissableModal';
import { Table, type Column } from './Table';
import { TERRITORY_ACTION_LABELS } from './TerritoryInfo';
import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';

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
};

export function TerritoriesModal({ isOpen, onDismiss }: TerritoriesModalProps) {
  const map = useGameStore((s) => s.map);
  const phase = useGameStore((s) => s.phase);
  useGameStore((s) => s.mapRevision);
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
    [map, phase],
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
        render: (r) => `+${r.foodProduction}`,
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

  return (
    <DismissableModal isOpen={isOpen} onDismiss={onDismiss} title="Territories">
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

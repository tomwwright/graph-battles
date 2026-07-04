import { useMemo } from 'react';
import { Edge, Territory, Values } from '@battles/models';
import type { ID, Unit } from '@battles/models';
import { DismissableModal } from './DismissableModal';
import { Table, type Column } from './Table';
import { useGameStore } from '../../state/useGameStore';
import { useDispatch } from '../../state/useDispatch';
import panelStyles from './panels.module.css';

const STATUS_LABELS: Record<number, string> = {
  [Values.Status.DEFEND]: 'DEFEND',
  [Values.Status.STARVE]: 'STARVE',
};

type UnitRow = {
  id: ID;
  ownerId: ID | null;
  ownerColour: string;
  locationId: ID;
  locationLabel: string;
  statuses: Values.Status[];
  destinationId: ID | null;
  destinationLabel: string | null;
};

function locationLabel(unit: Unit): string {
  const loc = unit.location;
  if (loc instanceof Edge) return `${loc.data.id} (${loc.data.territoryAId}↔${loc.data.territoryBId})`;
  if (loc instanceof Territory) return loc.data.id;
  return '—';
}

type UnitsModalProps = {
  isOpen: boolean;
  onDismiss: () => void;
  onSwitch?: () => void;
};

export function UnitsModal({ isOpen, onDismiss, onSwitch }: UnitsModalProps) {
  const map = useGameStore((s) => s.map);
  const phase = useGameStore((s) => s.phase);
  const mapRevision = useGameStore((s) => s.mapRevision);
  const dispatch = useDispatch();
  const isPlanning = phase.type === 'planning';

  const rows = useMemo<UnitRow[]>(
    () =>
      map.units.map((u) => ({
        id: u.data.id,
        ownerId: u.player?.data.id ?? null,
        ownerColour: Values.ColourStrings[u.player?.data.colour] ?? 'grey',
        locationId: u.data.locationId,
        locationLabel: locationLabel(u),
        statuses: u.data.statuses,
        destinationId: u.destinationId,
        destinationLabel: u.destinationId ?? null,
      })),
    [map, phase, mapRevision],
  );

  const columns = useMemo<Column<UnitRow>[]>(
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
        header: 'Unit',
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
        key: 'location',
        header: 'Location',
        render: (r) => (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              dispatch({ type: 'focus', id: r.locationId });
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
            {r.locationLabel}
          </button>
        ),
        sortValue: (r) => r.locationLabel,
      },
      {
        key: 'statuses',
        header: 'Status',
        render: (r) =>
          r.statuses.length === 0
            ? null
            : r.statuses.map((s) => STATUS_LABELS[s] ?? String(s)).join(' '),
        sortValue: (r) => r.statuses.length,
      },
      {
        key: 'move',
        header: 'Move',
        render: (r) =>
          r.destinationLabel == null ? null : (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span>→ {r.destinationLabel}</span>
              <button
                type="button"
                disabled={!isPlanning}
                onClick={() => dispatch({ type: 'cancel-move', unitIds: [r.id] })}
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
      <span>Units</span>
      <button type="button" className={panelStyles.button} onClick={onSwitch}>
        Switch to Territories →
      </button>
    </span>
  ) : (
    'Units'
  );

  return (
    <DismissableModal isOpen={isOpen} onDismiss={onDismiss} title={title}>
      <Table
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        defaultSort={{ key: 'owner', direction: 'asc' }}
        emptyState="No units."
      />
    </DismissableModal>
  );
}

import { useMemo, useState, type ReactNode } from 'react';
import styles from './Table.module.css';

export type Column<T> = {
  key: string;
  header?: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  width?: string;
};

type SortState = { key: string; direction: 'asc' | 'desc' };

type TableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  defaultSort?: SortState;
  showHeader?: boolean;
  emptyState?: ReactNode;
  className?: string;
};

const alignClass = {
  left: styles.alignLeft,
  right: styles.alignRight,
  center: styles.alignCenter,
};

export function Table<T>({
  columns,
  rows,
  getRowKey,
  defaultSort,
  showHeader = true,
  emptyState,
  className,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return 0;
    });
  }, [rows, columns, sort]);

  const toggleSort = (key: string) => {
    setSort((curr) => {
      if (curr?.key !== key) return { key, direction: 'asc' };
      return { key, direction: curr.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const hasWidths = columns.some((c) => c.width);

  return (
    <table className={className ? `${styles.table} ${className}` : styles.table}>
      {hasWidths && (
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
      )}
      {showHeader && (
        <thead>
          <tr>
            {columns.map((c) => {
              const align = c.align ?? 'left';
              const sortable = !!c.sortValue;
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={`${styles.headerCell} ${alignClass[align]}`}
                  aria-sort={
                    active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => toggleSort(c.key)}
                    >
                      <span>{c.header}</span>
                      {active ? (
                        <span className={styles.sortIndicator} aria-hidden="true">
                          {sort?.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      ) : (
                        <span className={styles.sortIndicatorIdle} aria-hidden="true">
                          ⇅
                        </span>
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
      )}
      <tbody>
        {sortedRows.length === 0
          ? emptyState != null && (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  {emptyState}
                </td>
              </tr>
            )
          : sortedRows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={`${styles.cell} ${alignClass[c.align ?? 'left']}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
    </table>
  );
}

// @risklab/ui � Table component

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type HTMLAttributes,
  type TdHTMLAttributes,
} from 'react';
import type { BaseProps } from '../styling/types';
import { cx } from '../styling/cx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableSize = 'sm' | 'md' | 'lg';

export type TableSortDirection = 'asc' | 'desc';

export interface Column<T extends Record<string, unknown>> {
  /** Property key or custom key identifier. */
  key: keyof T | (string & {});
  /** Header content. */
  header: ReactNode;
  /** Custom cell renderer. */
  render?: (row: T, index: number) => ReactNode;
  /** Column width. */
  width?: string | number;
  /** Cell content alignment. */
  align?: 'left' | 'center' | 'right';
  /** Whether the column is sortable. */
  sortable?: boolean;
}

export interface TableProps<T extends Record<string, unknown>>
  extends BaseProps,
    Omit<HTMLAttributes<HTMLTableElement>, 'style' | 'className'> {
  /** Column definitions. */
  columns: Column<T>[];
  /** Row data. */
  data: T[];
  /** Currently sorted column key. */
  sortColumn?: string;
  /** Current sort direction. */
  sortDirection?: TableSortDirection;
  /** Sort change callback. */
  onSort?: (column: string, direction: TableSortDirection) => void;
  /** Stick the header row to the top on scroll. */
  stickyHeader?: boolean;
  /** Alternate row striping. */
  striped?: boolean;
  /** Highlight rows on hover. */
  hover?: boolean;
  /** Density size. */
  size?: TableSize;
  /** Content shown when data is empty. */
  emptyMessage?: ReactNode;
  /** Show a loading state overlay. */
  loading?: boolean;
  /** Row click handler. */
  onRowClick?: (row: T, index: number) => void;
  /** Set of selected row indices. */
  selectedRows?: Set<number>;
  /** Row selection callback. */
  onRowSelect?: (index: number, selected: boolean) => void;
  /** Table caption. */
  caption?: ReactNode;
  /** Unique row key accessor; defaults to index. */
  getRowKey?: (row: T, index: number) => string | number;
}

// ---------------------------------------------------------------------------
// Base styles are now in ui.css: .ui-table th, .ui-table td
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

export interface TableHeadProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLTableSectionElement>, 'style' | 'className'> {
  children?: ReactNode;
}

export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function TableHead({ className, style, xstyle, testId, children, ...rest }, ref) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? {
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
            : undefined),
          ...style,
        }
      : undefined;
    return (
      <thead
        ref={ref}
        className={cx('ui-table-head', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </thead>
    );
  },
);

export interface TableBodyProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLTableSectionElement>, 'style' | 'className'> {
  children?: ReactNode;
}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, style, xstyle, testId, children, ...rest }, ref) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? {
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
            : undefined),
          ...style,
        }
      : undefined;
    return (
      <tbody
        ref={ref}
        className={cx('ui-table-body', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </tbody>
    );
  },
);

export interface TableRowProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLTableRowElement>, 'style' | 'className'> {
  /** Whether the row is selected. */
  selected?: boolean;
  children?: ReactNode;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ selected, className, style, xstyle, testId, children, ...rest }, ref) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? {
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
            : undefined),
          ...style,
        }
      : undefined;
    return (
      <tr
        ref={ref}
        className={cx('ui-table-row', selected && 'ui-table-row--selected', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        aria-selected={selected ? 'true' : undefined}
        {...rest}
      >
        {children}
      </tr>
    );
  },
);

export interface TableCellProps
  extends BaseProps,
    Omit<TdHTMLAttributes<HTMLTableCellElement>, 'style' | 'className' | 'align'> {
  /** Content alignment. */
  align?: 'left' | 'center' | 'right';
  /** Render as `<th>` instead of `<td>`. */
  header?: boolean;
  children?: ReactNode;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell(
    { align, header = false, className, style, xstyle, testId, children, ...rest },
    ref,
  ) {
    const Component = header ? 'th' : 'td';
    // Base th/td styles are in ui.css; only user overrides go inline
    const userStyle: CSSProperties | undefined = (style || xstyle || align)
      ? {
          ...(align ? { textAlign: align } : undefined),
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
            : undefined),
          ...style,
        }
      : undefined;
    return (
      <Component
        ref={ref}
        className={cx(header ? 'ui-table-th' : 'ui-table-td', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

// ---------------------------------------------------------------------------
// Sort indicator
// ---------------------------------------------------------------------------

function SortIndicator({ direction }: { direction?: TableSortDirection }) {
  return (
    <span
      aria-hidden="true"
      className={cx('ui-table-sort-indicator', !direction && 'ui-table-sort-indicator--inactive')}
    >
      {direction === 'desc' ? '?' : '?'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main Table component
// ---------------------------------------------------------------------------

function TableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    sortColumn,
    sortDirection,
    onSort,
    stickyHeader = false,
    striped = false,
    hover = false,
    size = 'md',
    emptyMessage = 'No data',
    loading = false,
    onRowClick,
    selectedRows,
    onRowSelect,
    caption,
    getRowKey,
    className,
    style,
    xstyle,
    testId,
    ...rest
  }: TableProps<T>,
  ref: React.ForwardedRef<HTMLTableElement>,
) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const key = String(col.key);
    const newDir: TableSortDirection =
      sortColumn === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDir);
  };

  const resolvedStyle: CSSProperties | undefined = (xstyle || style)
    ? {
        ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
        ...(Array.isArray(xstyle)
          ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
          : undefined),
        ...style,
      }
    : undefined;

  return (
    <div className="ui-table-wrapper">
      {loading && (
        <div className="ui-table-loading-overlay" role="status" aria-label="Loading">
          <span>Loading\u2026</span>
        </div>
      )}
      <table
        ref={ref}
        className={cx('ui-table', hover && 'ui-table--hover', striped && 'ui-table--striped', className)}
        {...(resolvedStyle ? { style: resolvedStyle } : undefined)}
        data-testid={testId}
        data-size={size}
        role="table"
        aria-busy={loading ? 'true' : undefined}
        {...rest}
      >
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {onRowSelect && (
              <th
                className={cx('ui-table-th--checkbox', stickyHeader && 'ui-table-th--sticky')}
                scope="col"
              >
                <span className="ui-sr-only">Select</span>
              </th>
            )}
            {columns.map((col) => {
              const key = String(col.key);
              const isActive = sortColumn === key;
              return (
                <th
                  key={key}
                  scope="col"
                  className={cx(
                    col.align === 'right' && 'ui-table-th--right',
                    col.align === 'center' && 'ui-table-th--center',
                    col.sortable && 'ui-table-th--sortable',
                    stickyHeader && 'ui-table-th--sticky',
                  )}
                  {...(col.width != null ? { style: { width: col.width } } : undefined)}
                  aria-sort={
                    isActive
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  onClick={col.sortable ? () => handleSort(col) : undefined}
                  onKeyDown={
                    col.sortable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort(col);
                          }
                        }
                      : undefined
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                >
                  {col.header}
                  {col.sortable && (
                    <SortIndicator direction={isActive ? sortDirection : undefined} />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onRowSelect ? 1 : 0)}
                className="ui-table-td--empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const rowKey = getRowKey ? getRowKey(row, i) : i;
              const isSelected = selectedRows?.has(i) ?? false;
              return (
                <tr
                  key={rowKey}
                  className={cx(
                    'ui-table-row',
                    isSelected && 'ui-table-row--selected',
                    onRowClick && 'ui-table-row--clickable',
                  )}
                  onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  aria-selected={isSelected ? 'true' : undefined}
                  role="row"
                >
                  {onRowSelect && (
                    <td className="ui-table-td--checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onRowSelect(i, e.target.checked)}
                        aria-label={`Select row ${i + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const colKey = String(col.key);
                    const cellValue = col.render
                      ? col.render(row, i)
                      : (row[colKey as keyof T] as ReactNode);
                    return (
                      <td
                        key={colKey}
                        className={cx(
                          col.align === 'right' && 'ui-table-td--right',
                          col.align === 'center' && 'ui-table-td--center',
                        )}
                        role="cell"
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Table = forwardRef(TableInner) as <T extends Record<string, unknown>>(
  props: TableProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => React.ReactElement | null;

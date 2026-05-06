// @risklab/ui � DataGrid component (composes Table)

import React, {
  forwardRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type CSSProperties,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import type { BaseProps } from '../styling/types';
import { cx } from '../styling/cx';
import { Table, type Column, type TableSortDirection } from './Table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SortModelEntry {
  field: string;
  sort: 'asc' | 'desc';
}

export interface FilterModelEntry {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
}

export interface DataGridColumn<T extends Record<string, unknown>> extends Column<T> {
  /** Filterable � enables filter UI for this column. */
  filterable?: boolean;
}

export interface DataGridProps<T extends Record<string, unknown>>
  extends BaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Column definitions. */
  columns: DataGridColumn<T>[];
  /** Row data. */
  rows: T[];
  /** Rows per page. */
  pageSize?: number;
  /** Current page (0-indexed). */
  page?: number;
  /** Page change callback. */
  onPageChange?: (page: number) => void;
  /** Total number of rows (for server-side pagination). */
  totalRows?: number;
  /** Current sort model. */
  sortModel?: SortModelEntry[];
  /** Sort model change callback. */
  onSortModelChange?: (model: SortModelEntry[]) => void;
  /** Current filter model. */
  filterModel?: FilterModelEntry[];
  /** Filter model change callback. */
  onFilterModelChange?: (model: FilterModelEntry[]) => void;
  /** Enable row selection checkboxes. */
  checkboxSelection?: boolean;
  /** Row height in pixels. */
  rowHeight?: number;
  /** Header height in pixels. */
  headerHeight?: number;
  /** Show loading overlay. */
  loading?: boolean;
  /** Custom row id extractor. */
  getRowId?: (row: T, index: number) => string | number;
  /** Row click handler. */
  onRowClick?: (row: T, index: number) => void;
  /** Externally selected row ids. */
  selectedRowIds?: Iterable<string | number>;
  /** Empty state message. */
  emptyMessage?: ReactNode;
}

// ---------------------------------------------------------------------------
// Pagination bar
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageSize, totalRows, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalRows);

  return (
    <nav
      className="ui-datagrid-pagination"
      role="navigation"
      aria-label="Pagination"
    >
      <span>
        {totalRows === 0 ? '0 rows' : `${start}�${end} of ${totalRows}`}
      </span>
      <button
        type="button"
        className="ui-datagrid-pagination-btn"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        ?
      </button>
      <span aria-current="page">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        className="ui-datagrid-pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        ?
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Filter row helpers
// ---------------------------------------------------------------------------

function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: FilterModelEntry[],
): T[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const val = String(row[f.field] ?? '').toLowerCase();
      const target = f.value.toLowerCase();
      switch (f.operator) {
        case 'contains':
          return val.includes(target);
        case 'equals':
          return val === target;
        case 'startsWith':
          return val.startsWith(target);
        case 'endsWith':
          return val.endsWith(target);
        default:
          return true;
      }
    }),
  );
}

function applySorting<T extends Record<string, unknown>>(
  rows: T[],
  sortModel: SortModelEntry[],
): T[] {
  if (sortModel.length === 0) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const { field, sort } of sortModel) {
      const aVal = a[field];
      const bVal = b[field];
      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));
      if (cmp !== 0) return sort === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// DataGrid inner implementation
// ---------------------------------------------------------------------------

function DataGridInner<T extends Record<string, unknown>>(
  {
    columns,
    rows,
    pageSize = 25,
    page: controlledPage,
    onPageChange,
    totalRows: externalTotalRows,
    sortModel: controlledSortModel,
    onSortModelChange,
    filterModel: controlledFilterModel,
    checkboxSelection = false,
    rowHeight,
    headerHeight,
    loading = false,
    getRowId,
    onRowClick,
    selectedRowIds,
    emptyMessage,
    className,
    style,
    xstyle,
    testId,
    ...rest
  }: DataGridProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  // Internal state for uncontrolled usage
  const [internalPage, setInternalPage] = useState(0);
  const [internalSortModel, setInternalSortModel] = useState<SortModelEntry[]>([]);
  const [internalFilterModel] = useState<FilterModelEntry[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;
  const sortModel = controlledSortModel ?? internalSortModel;
  const filterModel = controlledFilterModel ?? internalFilterModel;

  const handleSortModelChange = useCallback(
    (model: SortModelEntry[]) => {
      if (onSortModelChange) {
        onSortModelChange(model);
      } else {
        setInternalSortModel(model);
      }
    },
    [onSortModelChange],
  );

  // Reset page when sort or filter changes (only for uncontrolled page)
  const sortKey = sortModel.map(s => `${s.field}:${s.sort}`).join(',');
  const filterKey = filterModel.map(f => `${f.field}:${f.operator}:${f.value}`).join(',');
  useEffect(() => {
    if (controlledPage === undefined) setInternalPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, filterKey]);

  // Process data: filter ? sort ? paginate
  const filtered = useMemo(() => applyFilters(rows, filterModel), [rows, filterModel]);
  const sorted = useMemo(() => applySorting(filtered, sortModel), [filtered, sortModel]);
  const totalRows = externalTotalRows ?? sorted.length;
  const paginated = useMemo(
    () => sorted.slice(page * pageSize, (page + 1) * pageSize),
    [sorted, page, pageSize],
  );
  const paginatedRowIds = useMemo(
    () =>
      paginated.map((row, index) =>
        getRowId ? getRowId(row, page * pageSize + index) : page * pageSize + index,
      ),
    [paginated, getRowId, page, pageSize],
  );
  const selectedRowIdSet = useMemo(
    () => (selectedRowIds ? new Set(selectedRowIds) : null),
    [selectedRowIds],
  );

  // Map DataGridColumn ? Table Column (add sortable flag)
  const tableColumns: Column<T>[] = useMemo(
    () =>
      columns.map((col) => ({
        key: col.key,
        header: col.header,
        render: col.render,
        width: col.width,
        align: col.align,
        sortable: col.sortable ?? false,
      })),
    [columns],
  );

  // Current sort for Table
  const currentSort = sortModel[0];

  const handleTableSort = useCallback(
    (column: string, direction: TableSortDirection) => {
      handleSortModelChange([{ field: column, sort: direction }]);
    },
    [handleSortModelChange],
  );

  const handleRowSelect = useCallback(
    (index: number, selected: boolean) => {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        // The index here is relative to the paginated slice � map to absolute
        const absIndex = page * pageSize + index;
        if (selected) next.add(absIndex);
        else next.delete(absIndex);
        return next;
      });
    },
    [page, pageSize],
  );

  // Map selectedIndices (absolute) to the current page-local set
  const localSelected = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < paginated.length; i++) {
      if (selectedIndices.has(page * pageSize + i)) s.add(i);
      if (selectedRowIdSet?.has(paginatedRowIds[i])) s.add(i);
    }
    return s;
  }, [selectedIndices, paginated.length, page, pageSize, selectedRowIdSet, paginatedRowIds]);

  // Base layout lives in ui.css `.ui-datagrid`; only user overrides go inline.
  const resolvedStyle: CSSProperties | undefined =
    style || xstyle
      ? {
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>((a, s) => (s ? { ...a, ...s } : a), {})
            : undefined),
          ...style,
        }
      : undefined;

  return (
    <div
      ref={ref}
      className={cx('ui-datagrid', className)}
      {...(resolvedStyle ? { style: resolvedStyle } : undefined)}
      data-testid={testId}
      role="grid"
      aria-busy={loading ? 'true' : undefined}
      aria-rowcount={totalRows}
      {...rest}
    >
      <Table<T>
        columns={tableColumns}
        data={paginated}
        sortColumn={currentSort?.field}
        sortDirection={currentSort?.sort}
        onSort={handleTableSort}
        stickyHeader
        hover
        loading={loading}
        emptyMessage={emptyMessage}
        selectedRows={localSelected.size > 0 ? localSelected : undefined}
        onRowSelect={checkboxSelection ? handleRowSelect : undefined}
        onRowClick={
          onRowClick
            ? (row, index) => onRowClick(row, page * pageSize + index)
            : undefined
        }
        getRowKey={
          getRowId
            ? (row, index) => getRowId(row, page * pageSize + index)
            : undefined
        }
        style={{
          ...(rowHeight != null
            ? { '--ui-table-cell-padding': `${(rowHeight - 20) / 2}px 0.75rem` } as CSSProperties
            : undefined),
          ...(headerHeight != null
            ? { '--ui-table-th-height': `${headerHeight}px` } as CSSProperties
            : undefined),
        }}
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        totalRows={totalRows}
        onPageChange={setPage}
      />
    </div>
  );
}

export const DataGrid = forwardRef(DataGridInner) as <T extends Record<string, unknown>>(
  props: DataGridProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement | null;

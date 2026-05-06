import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
} from 'react';
import { cx } from '../styling/cx';

/* -------------------------------------------------------------------------- */
/*  Grid                                                                      */
/* -------------------------------------------------------------------------- */

type ColumnsValue = number | 'auto-fill' | 'auto-fit' | string;

interface GridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;

  /** Shorthand column count or keyword. */
  columns?: ColumnsValue;
  /** Shorthand row count or template. */
  rows?: string | number;
  /** Gap between cells. */
  gap?: string | number;
  /** Row gap override. */
  rowGap?: string | number;
  /** Column gap override. */
  colGap?: string | number;
  alignItems?: CSSProperties['alignItems'];
  justifyItems?: CSSProperties['justifyItems'];
  /** Explicit grid-template-columns. */
  templateColumns?: string;
  /** Explicit grid-template-rows. */
  templateRows?: string;
  autoFlow?: CSSProperties['gridAutoFlow'];
  autoRows?: string;
  autoCols?: string;
  /**
   * Minimum child width for auto-fill with minmax.
   * Generates `repeat(auto-fill, minmax(<value>, 1fr))`.
   */
  minChildWidth?: string | number;
}

function resolveSize(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

function resolveTemplateColumns(props: GridProps): string | undefined {
  if (props.templateColumns) return props.templateColumns;
  if (props.minChildWidth !== undefined) {
    const min = resolveSize(props.minChildWidth);
    return `repeat(auto-fill, minmax(${min}, 1fr))`;
  }
  if (props.columns !== undefined) {
    if (typeof props.columns === 'number') {
      return `repeat(${props.columns}, 1fr)`;
    }
    if (props.columns === 'auto-fill' || props.columns === 'auto-fit') {
      return `repeat(${props.columns}, 1fr)`;
    }
    return props.columns;
  }
  return undefined;
}

function resolveTemplateRows(props: GridProps): string | undefined {
  if (props.templateRows) return props.templateRows;
  if (props.rows !== undefined) {
    if (typeof props.rows === 'number') return `repeat(${props.rows}, 1fr)`;
    return props.rows;
  }
  return undefined;
}

/**
 * CSS Grid layout component.
 */
const Grid = forwardRef<HTMLDivElement, GridProps>(
  function Grid(
    {
      className,
      style,
      xstyle,
      children,
      testId,
      columns,
      rows,
      gap,
      rowGap,
      colGap,
      alignItems,
      justifyItems,
      templateColumns,
      templateRows,
      autoFlow,
      autoRows,
      autoCols,
      minChildWidth,
      ...rest
    },
    ref: Ref<HTMLDivElement>,
  ) {
    const props: GridProps = {
      columns,
      rows,
      gap,
      rowGap,
      colGap,
      alignItems,
      justifyItems,
      templateColumns,
      templateRows,
      autoFlow,
      autoRows,
      autoCols,
      minChildWidth,
    };

    const gridStyle: CSSProperties = {
      gridTemplateColumns: resolveTemplateColumns(props),
      gridTemplateRows: resolveTemplateRows(props),
      gap: resolveSize(gap),
      rowGap: resolveSize(rowGap),
      columnGap: resolveSize(colGap),
      alignItems,
      justifyItems,
      gridAutoFlow: autoFlow,
      gridAutoRows: autoRows,
      gridAutoColumns: autoCols,
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    const hasGridStyle = Object.values(gridStyle).some(v => v !== undefined);

    return (
      <div
        ref={ref}
        className={cx('ui-grid', className)}
        {...(hasGridStyle ? { style: gridStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  GridItem                                                                   */
/* -------------------------------------------------------------------------- */

interface GridItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;

  colSpan?: number | string;
  rowSpan?: number | string;
  colStart?: number | string;
  colEnd?: number | string;
  rowStart?: number | string;
  rowEnd?: number | string;
  area?: string;
}

/**
 * Grid child that controls its placement within a Grid.
 */
const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  function GridItem(
    {
      className,
      style,
      xstyle,
      children,
      testId,
      colSpan,
      rowSpan,
      colStart,
      colEnd,
      rowStart,
      rowEnd,
      area,
      ...rest
    },
    ref: Ref<HTMLDivElement>,
  ) {
    const itemStyle: CSSProperties = {
      gridColumn: colSpan !== undefined
        ? `span ${colSpan}`
        : undefined,
      gridRow: rowSpan !== undefined
        ? `span ${rowSpan}`
        : undefined,
      gridColumnStart: colStart !== undefined ? String(colStart) : undefined,
      gridColumnEnd: colEnd !== undefined ? String(colEnd) : undefined,
      gridRowStart: rowStart !== undefined ? String(rowStart) : undefined,
      gridRowEnd: rowEnd !== undefined ? String(rowEnd) : undefined,
      gridArea: area,
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    const hasItemStyle = Object.values(itemStyle).some(v => v !== undefined);

    return (
      <div
        ref={ref}
        className={cx('ui-grid-item', className)}
        {...(hasItemStyle ? { style: itemStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export { Grid, GridItem };
export type { GridProps, GridItemProps };

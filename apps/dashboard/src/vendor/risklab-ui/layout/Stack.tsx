import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  Children,
  Fragment,
  forwardRef,
} from 'react';
import { cx, sx } from '../styling';

type Direction = 'row' | 'column';

interface StackProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;

  /** Stack direction. Default 'column'. */
  direction?: Direction;
  /** Gap between children. Accepts a CSS value or number (px). */
  gap?: string | number;
  /** Corresponds to align-items. */
  align?: CSSProperties['alignItems'];
  /** Corresponds to justify-content. */
  justify?: CSSProperties['justifyContent'];
  /** Flex wrap. */
  wrap?: CSSProperties['flexWrap'] | boolean;
  /** ReactNode inserted between each child. */
  divider?: ReactNode;
  /** Use inline-flex instead of flex. */
  inline?: boolean;
  /** Reverse the direction. */
  reverse?: boolean;
}

function resolveDirection(
  direction: Direction | undefined,
  reverse: boolean | undefined,
): CSSProperties['flexDirection'] {
  const base = direction ?? 'column';
  if (reverse) return base === 'column' ? 'column-reverse' : 'row-reverse';
  return base;
}

function resolveGap(v: string | number | undefined): string | undefined {
  if (v === undefined) return 'var(--ui-stack-gap, 0px)';
  return typeof v === 'number' ? `${v}px` : v;
}

function resolveWrap(v: CSSProperties['flexWrap'] | boolean | undefined): CSSProperties['flexWrap'] | undefined {
  if (v === true) return 'wrap';
  if (v === false) return 'nowrap';
  return v;
}

/**
 * Vertical or horizontal stack with consistent gap.
 * Optionally inserts a divider ReactNode between each child.
 */
const Stack = forwardRef<HTMLDivElement, StackProps>(
  function Stack(
    {
      className,
      style,
      xstyle,
      children,
      testId,
      direction,
      gap,
      align,
      justify,
      wrap,
      divider,
      inline,
      reverse,
      ...rest
    },
    ref: Ref<HTMLDivElement>,
  ) {
    const stackStyle: CSSProperties = {
      display: inline ? 'inline-flex' : 'flex',
      flexDirection: resolveDirection(direction, reverse),
      gap: divider ? undefined : resolveGap(gap),
      alignItems: align,
      justifyContent: justify,
      flexWrap: resolveWrap(wrap),
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    let content: ReactNode = children;

    if (divider) {
      const items = Children.toArray(children).filter(Boolean);
      const gapValue = resolveGap(gap);
      const isVertical = (direction ?? 'column') === 'column';

      content = items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <div
              role="separator"
              className={sx({
                ...(isVertical
                  ? { marginTop: gapValue ?? null, marginBottom: gapValue ?? null }
                  : { marginLeft: gapValue ?? null, marginRight: gapValue ?? null }),
                flexShrink: 0,
              }).className}
            >
              {divider}
            </div>
          )}
          {child}
        </Fragment>
      ));
    }

    return (
      <div
        ref={ref}
        className={cx(className, sx({
          ...(stackStyle as Record<string, string | number | null | undefined>),
          gap: divider ? null : (resolveGap(gap) ?? null),
        }).className)}
        data-testid={testId}
        {...rest}
      >
        {content}
      </div>
    );
  },
);

export { Stack };
export type { StackProps };

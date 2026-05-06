import {
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
  forwardRef,
} from 'react';
import { cx, sx } from '../styling';

type Orientation = 'horizontal' | 'vertical';
type Variant = 'solid' | 'dashed' | 'dotted';

interface DividerProps extends Omit<HTMLAttributes<HTMLHRElement>, 'style' | 'children'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: never;
  testId?: string;

  /** Default 'horizontal'. */
  orientation?: Orientation;
  /** Border style variant. Default 'solid'. */
  variant?: Variant;
  /** Border thickness. */
  thickness?: string | number;
  /** Border color. */
  color?: string;
  /** Margin before and after the divider. */
  spacing?: string | number;
}

function resolveSize(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

/**
 * Semantic horizontal or vertical divider line.
 */
const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(
    {
      className,
      style,
      xstyle,
      testId,
      orientation = 'horizontal',
      variant = 'solid',
      thickness,
      color,
      spacing,
      ...rest
    },
    ref: Ref<HTMLHRElement>,
  ) {
    const isHorizontal = orientation === 'horizontal';
    const resolvedThickness = resolveSize(thickness) ?? 'var(--ui-divider-thickness, 1px)';
    const resolvedColor = color ?? 'var(--ui-divider-color, currentColor)';
    const resolvedSpacing = resolveSize(spacing);

    const dividerStyle: CSSProperties = {
      border: 'none',
      margin: 0,
      flexShrink: 0,
      ...(isHorizontal
        ? {
            width: '100%',
            height: 0,
            borderBottom: `${resolvedThickness} ${variant} ${resolvedColor}`,
            marginTop: resolvedSpacing ?? 'var(--ui-divider-spacing, 0px)',
            marginBottom: resolvedSpacing ?? 'var(--ui-divider-spacing, 0px)',
          }
        : {
            height: '100%',
            width: 0,
            alignSelf: 'stretch',
            borderRight: `${resolvedThickness} ${variant} ${resolvedColor}`,
            marginLeft: resolvedSpacing ?? 'var(--ui-divider-spacing, 0px)',
            marginRight: resolvedSpacing ?? 'var(--ui-divider-spacing, 0px)',
          }),
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    return isHorizontal ? (
      <hr
        ref={ref}
        className={cx(className, sx(dividerStyle as Record<string, string | number>).className)}
        role="separator"
        aria-orientation="horizontal"
        data-testid={testId}
        {...rest}
      />
    ) : (
      <hr
        ref={ref}
        className={cx(className, sx(dividerStyle as Record<string, string | number>).className)}
        role="separator"
        aria-orientation="vertical"
        data-testid={testId}
        {...rest}
      />
    );
  },
);

export { Divider };
export type { DividerProps };

import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
} from 'react';
import { cx, sx } from '../styling';

type MaxWidthPreset = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const MAX_WIDTH_MAP: Record<MaxWidthPreset, string> = {
  sm: 'var(--ui-container-sm, 640px)',
  md: 'var(--ui-container-md, 768px)',
  lg: 'var(--ui-container-lg, 1024px)',
  xl: 'var(--ui-container-xl, 1280px)',
  full: '100%',
};

interface ContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;
  /** Maximum width of the container. Accepts a preset or a number (px). Default 'lg'. */
  maxWidth?: MaxWidthPreset | number;
  /** Horizontal gutter padding. Default uses a design-token. */
  gutter?: string | number;
}

function resolveMaxWidth(value: MaxWidthPreset | number | undefined): string {
  if (value === undefined) return MAX_WIDTH_MAP.lg;
  if (typeof value === 'number') return `${value}px`;
  return MAX_WIDTH_MAP[value] ?? MAX_WIDTH_MAP.lg;
}

function resolveGutter(value: string | number | undefined): string {
  if (value === undefined) return 'var(--ui-container-gutter, 1rem)';
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Centered max-width container with horizontal gutter padding.
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  function Container(
    { className, style, xstyle, children, testId, maxWidth, gutter, ...rest },
    ref: Ref<HTMLDivElement>,
  ) {
    const resolvedStyle: CSSProperties = {
      width: '100%',
      maxWidth: resolveMaxWidth(maxWidth),
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: resolveGutter(gutter),
      paddingRight: resolveGutter(gutter),
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cx(className, sx(resolvedStyle as Record<string, string | number>).className)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export { Container };
export type { ContainerProps, MaxWidthPreset };

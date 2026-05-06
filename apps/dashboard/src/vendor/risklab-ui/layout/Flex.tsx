import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
} from 'react';
import { cx, sx } from '../styling';

interface FlexProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;

  /** Flex direction. */
  direction?: CSSProperties['flexDirection'];
  /** Flex wrap. */
  wrap?: CSSProperties['flexWrap'] | boolean;
  /** Gap between children. */
  gap?: string | number;
  /** align-items. */
  align?: CSSProperties['alignItems'];
  /** justify-content. */
  justify?: CSSProperties['justifyContent'];
  /** Use inline-flex. */
  inline?: boolean;
  /** flex-grow. */
  grow?: CSSProperties['flexGrow'];
  /** flex-shrink. */
  shrink?: CSSProperties['flexShrink'];
  /** flex-basis. */
  basis?: CSSProperties['flexBasis'];
}

function resolveGap(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

function resolveWrap(v: CSSProperties['flexWrap'] | boolean | undefined): CSSProperties['flexWrap'] | undefined {
  if (v === true) return 'wrap';
  if (v === false) return 'nowrap';
  return v;
}

/**
 * Thin Flexbox layout facade.
 */
const Flex = forwardRef<HTMLDivElement, FlexProps>(
  function Flex(
    {
      className,
      style,
      xstyle,
      children,
      testId,
      direction,
      wrap,
      gap,
      align,
      justify,
      inline,
      grow,
      shrink,
      basis,
      ...rest
    },
    ref: Ref<HTMLDivElement>,
  ) {
    const flexStyle: CSSProperties = {
      display: inline ? 'inline-flex' : 'flex',
      flexDirection: direction,
      flexWrap: resolveWrap(wrap),
      gap: resolveGap(gap),
      alignItems: align,
      justifyContent: justify,
      flexGrow: grow,
      flexShrink: shrink,
      flexBasis: basis,
      ...(xstyle as CSSProperties | undefined),
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cx(className, sx(flexStyle as Record<string, string | number>).className)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export { Flex };
export type { FlexProps };

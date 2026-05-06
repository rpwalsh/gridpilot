// @risklab/ui � Badge component

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import type { ColorVariant, BaseProps } from '../styling/types';
import { cx } from '../styling/cx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant = 'standard' | 'dot';
export type BadgeOverlap = 'rectangle' | 'circular';

export interface BadgeAnchorOrigin {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'right';
}

export interface BadgeProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLSpanElement>, 'style' | 'className' | 'content'> {
  /** Badge content (number, text, or element). */
  content?: ReactNode;
  /** Maximum numeric value � shows `{max}+` when exceeded. */
  max?: number;
  /** Show a small dot indicator instead of content. */
  dot?: boolean;
  /** Hide the badge. */
  invisible?: boolean;
  /** Visual variant. */
  variant?: BadgeVariant;
  /** Colour scheme. */
  color?: ColorVariant;
  /** How the badge overlaps its children. */
  overlap?: BadgeOverlap;
  /** Anchor position. */
  anchorOrigin?: BadgeAnchorOrigin;
  /** The element the badge wraps. */
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    {
      content,
      max = 99,
      dot = false,
      invisible = false,
      variant = 'standard',
      color = 'error',
      overlap = 'rectangle',
      anchorOrigin = { vertical: 'top', horizontal: 'right' },
      className,
      style,
      xstyle,
      testId,
      children,
      ...rest
    },
    ref,
  ) {
    const isDot = dot || variant === 'dot';
    const isInvisible = invisible || (content == null && !isDot);

    // Format the content � clamp to max
    let displayContent: ReactNode = null;
    if (!isDot && content != null) {
      if (typeof content === 'number' && max != null && content > max) {
        displayContent = `${max}+`;
      } else {
        displayContent = content;
      }
    }

    const anchorKey = `${anchorOrigin.vertical}-${anchorOrigin.horizontal}`;

    const userStyle: CSSProperties | undefined =
      (style || xstyle)
        ? {
            ...(xstyle && !Array.isArray(xstyle) ? (xstyle as CSSProperties) : undefined),
            ...(Array.isArray(xstyle)
              ? (xstyle as Array<Record<string, string | number> | false | null | undefined>).reduce<Record<string, string | number>>(
                  (a, s) => (s ? { ...a, ...s } : a),
                  {},
                )
              : undefined),
            ...style,
          }
        : undefined;

    return (
      <span
        ref={ref}
        className={cx('ui-badge', className)}
        data-anchor={anchorKey}
        data-overlap={overlap}
        data-color={color}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
        <span
          className={cx(
            'ui-badge__indicator',
            isDot && 'ui-badge__indicator--dot',
            isInvisible && 'ui-badge__indicator--invisible',
          )}
          role="status"
          aria-label={
            isDot
              ? 'notification'
              : typeof displayContent === 'string' || typeof displayContent === 'number'
                ? String(displayContent)
                : undefined
          }
        >
          {isDot ? null : displayContent}
        </span>
      </span>
    );
  },
);

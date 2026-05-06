// @risklab/ui � Chip component

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import type { SizeVariant, ColorVariant, BaseProps } from '../styling/types';
import { cx } from '../styling/cx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChipVariant = 'solid' | 'outlined' | 'soft';

export interface ChipProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLSpanElement>, 'style' | 'className' | 'color' | 'onClick'> {
  /** Chip label � required. */
  label: string | ReactNode;
  /** Visual variant. */
  variant?: ChipVariant;
  /** Size. */
  size?: SizeVariant;
  /** Colour scheme. */
  color?: ColorVariant;
  /** Icon rendered before the label. */
  icon?: ReactNode;
  /** Avatar rendered before the label (takes precedence over icon). */
  avatar?: ReactNode;
  /** Custom delete icon. */
  deleteIcon?: ReactNode;
  /** Called when the delete button is pressed � shows the delete icon. */
  onDelete?: () => void;
  /** Make the chip clickable/focusable. */
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;
  /** Disabled state. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Default delete icon
// ---------------------------------------------------------------------------

function DefaultDeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  function Chip(
    {
      label,
      variant = 'solid',
      size = 'md',
      color = 'primary',
      icon,
      avatar,
      deleteIcon,
      onDelete,
      onClick,
      disabled = false,
      className,
      style,
      xstyle,
      testId,
      ...rest
    },
    ref,
  ) {
    const isClickable = !!onClick;

    // Only user-passthrough styles go inline; size/variant/color are in CSS
    const userStyle: CSSProperties | undefined = (style || xstyle)
      ? {
          ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
          ...(Array.isArray(xstyle)
            ? xstyle.reduce<Record<string, string | number>>(
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
        className={cx(
          'ui-chip',
          `ui-chip--${variant}`,
          `ui-chip--${size}`,
          disabled && 'ui-chip--disabled',
          isClickable && 'ui-chip--clickable',
          className,
        )}
        {...(userStyle ? { style: userStyle } : undefined)}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable && !disabled ? 0 : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={!disabled ? onClick : undefined}
        onKeyDown={
          isClickable && !disabled
            ? (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
                }
              }
            : undefined
        }
        data-testid={testId}
        data-variant={variant}
        data-size={size}
        data-color={color}
        {...rest}
      >
        {avatar && (
          <span
            className="ui-chip__avatar"
            aria-hidden="true"
          >
            {avatar}
          </span>
        )}
        {!avatar && icon && (
          <span
            className="ui-chip__icon"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="ui-chip__label">
          {label}
        </span>
        {onDelete && (
          <button
            type="button"
            className="ui-chip__delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Remove"
            tabIndex={-1}
            disabled={disabled}
          >
            {deleteIcon ?? <DefaultDeleteIcon />}
          </button>
        )}
      </span>
    );
  },
);

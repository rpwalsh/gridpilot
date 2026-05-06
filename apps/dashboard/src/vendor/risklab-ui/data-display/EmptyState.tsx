import React, { forwardRef } from 'react';
import type { ColorVariant, SizeVariant } from '../styling/types';
import { cx, sx } from '../styling';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  illustration?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: SizeVariant;
  color?: ColorVariant;
  align?: 'center' | 'left';
  bordered?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  primary: '📭',
  secondary: '🗂️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    illustration,
    icon,
    title,
    description,
    action,
    secondaryAction,
    size = 'md',
    color = 'primary',
    align = 'center',
    bordered = false,
    xstyle,
    testId,
    className,
    style,
    ...rest
  },
  ref
) {
  const iconSize = size === 'xs' ? 32 : size === 'sm' ? 40 : size === 'lg' ? 64 : size === 'xl' ? 80 : 52;
  const titleSize = size === 'xs' ? '14px' : size === 'sm' ? '15px' : size === 'lg' ? '20px' : size === 'xl' ? '22px' : '17px';
  const descSize = size === 'xs' ? '12px' : size === 'sm' ? '13px' : size === 'lg' ? '15px' : size === 'xl' ? '16px' : '14px';
  const padding = size === 'xs' ? '20px' : size === 'sm' ? '28px' : size === 'lg' ? '52px' : size === 'xl' ? '64px' : '40px';
  const mergedExternalStyles = Array.isArray(xstyle)
    ? xstyle.reduce<Record<string, string | number>>((acc, entry) => (entry ? { ...acc, ...entry } : acc), {})
    : xstyle;

  const displayIcon = icon ?? (DEFAULT_ICONS[color] ?? DEFAULT_ICONS.primary);

  return (
    <div
      ref={ref}
      role="status"
      aria-label="Empty state"
      className={cx('ui-empty-state', className, sx({
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        textAlign: align,
        padding,
        gap: '12px',
        border: bordered ? '2px dashed var(--ui-color-border)' : null,
        borderRadius: bordered ? 'var(--ui-radius-lg, 12px)' : null,
        ...(style as Record<string, string | number> | undefined),
        ...(mergedExternalStyles as Record<string, string | number> | undefined),
      }).className)}
      data-testid={testId}
      {...rest}
    >
      {illustration ? (
        <div className={sx({ marginBottom: '8px' }).className}>{illustration}</div>
      ) : (
        <div
          className={sx({
            width: `${iconSize * 1.6}px`,
            height: `${iconSize * 1.6}px`,
            borderRadius: '50%',
            background: `color-mix(in srgb, var(--ui-color-${color}, var(--ui-color-primary)) 12%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${iconSize}px`,
            marginBottom: '4px',
          }).className}
        >
          {displayIcon}
        </div>
      )}
      <div className={sx({ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: align === 'center' ? 'center' : 'flex-start', maxWidth: '360px' }).className}>
        <h3 className={sx({ margin: 0, fontSize: titleSize, fontWeight: 600, color: 'var(--ui-color-text)', lineHeight: 1.3 }).className}>
          {title}
        </h3>
        {description && (
          <p className={sx({ margin: 0, fontSize: descSize, color: 'var(--ui-color-text-secondary)', lineHeight: 1.6 }).className}>
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className={sx({ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', marginTop: '8px' }).className}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
});

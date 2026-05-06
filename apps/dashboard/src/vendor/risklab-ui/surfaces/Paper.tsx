import React, { forwardRef } from 'react';

export type PaperVariant = 'elevated' | 'outlined' | 'filled';

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PaperVariant;
  elevation?: number;
  square?: boolean;
  component?: React.ElementType;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

const elevationShadow = [
  'none',
  'var(--ui-shadow-sm, 0 1px 3px rgba(0,0,0,0.12))',
  'var(--ui-shadow-md, 0 4px 6px rgba(0,0,0,0.1))',
  'var(--ui-shadow-lg, 0 10px 15px rgba(0,0,0,0.1))',
  'var(--ui-shadow-xl, 0 20px 25px rgba(0,0,0,0.1))',
  'var(--ui-shadow-2xl, 0 25px 50px rgba(0,0,0,0.25))',
];

export const Paper = forwardRef<HTMLDivElement, PaperProps>(function Paper(
  { variant = 'elevated', elevation = 1, square = false, component: Component = 'div', xstyle, testId, className, style, children, ...rest },
  ref
) {
  const shadow = variant === 'elevated' ? elevationShadow[Math.min(elevation, 5)] : 'none';
  const border = variant === 'outlined' ? '1px solid var(--ui-color-border, #e2e8f0)' : 'none';
  const bg = variant === 'filled' ? 'var(--ui-color-surface-variant, #f8fafc)' : 'var(--ui-color-surface, #fff)';

  return (
    <Component
      ref={ref}
      data-testid={testId}
      className={['ui-paper', `ui-paper--${variant}`, className].filter(Boolean).join(' ')}
      style={{
        background: bg,
        boxShadow: shadow,
        border,
        borderRadius: square ? 0 : 'var(--ui-radius-lg, 12px)',
        ...style,
        ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
      }}
      {...rest}
    >
      {children}
    </Component>
  );
});

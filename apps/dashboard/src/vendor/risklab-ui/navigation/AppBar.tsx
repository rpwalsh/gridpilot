import React, { forwardRef } from 'react';
import type { SizeVariant, ColorVariant } from '../styling/types';

export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  position?: 'static' | 'sticky' | 'fixed' | 'relative';
  color?: ColorVariant | 'default' | 'transparent';
  elevation?: number;
  enableColorOnDark?: boolean;
  square?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const AppBar = forwardRef<HTMLElement, AppBarProps>(function AppBar(
  { position = 'static', color = 'primary', elevation = 1, square = false, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const userStyle: React.CSSProperties | undefined =
    style || (xstyle && !Array.isArray(xstyle))
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <header
      ref={ref}
      data-testid={testId}
      data-position={position !== 'static' ? position : undefined}
      data-color={color !== 'primary' ? color : undefined}
      data-elevation={elevation !== 1 ? String(elevation) : undefined}
      data-square={square ? 'true' : undefined}
      className={['ui-appbar', className].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      {...rest}
    >
      {children}
    </header>
  );
});

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'regular' | 'dense';
  disableGutters?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { variant = 'regular', disableGutters = false, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const userStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={[
        'ui-toolbar',
        variant === 'dense' ? 'ui-toolbar--dense' : '',
        disableGutters ? 'ui-toolbar--no-gutters' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface NavItemProps extends React.HTMLAttributes<HTMLElement> {
  href?: string;
  active?: boolean;
  icon?: React.ReactNode;
  size?: SizeVariant;
  disabled?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const NavItem = forwardRef<HTMLElement, NavItemProps>(function NavItem(
  { href, active, icon, size = 'md', disabled, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const Tag: React.ElementType = href ? 'a' : 'button';

  const userStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as React.Ref<any>}
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      data-testid={testId}
      className={[
        'ui-nav-item',
        active ? 'ui-nav-item--active' : '',
        disabled ? 'ui-nav-item--disabled' : '',
        `ui-nav-item--${size}`,
        className,
      ].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </Tag>
  );
});


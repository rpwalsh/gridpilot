import React, { forwardRef, createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItemData {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  endContent?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
  shortcut?: string;
  onClick?: () => void;
  items?: MenuItemData[];
}

export interface MenuContextValue {
  onClose: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  anchorEl?: Element | null;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' | 'center' };
  transformOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' | 'center' };
  items?: MenuItemData[];
  minWidth?: string | number;
  maxHeight?: string | number;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

function getMenuPosition(anchor: Element, anchorOrigin: MenuProps['anchorOrigin'], transformOrigin: MenuProps['transformOrigin']) {
  const rect = anchor.getBoundingClientRect();
  const aV = anchorOrigin?.vertical ?? 'bottom';
  const aH = anchorOrigin?.horizontal ?? 'left';

  let top = aV === 'top' ? rect.top : rect.bottom;
  let left = aH === 'left' ? rect.left : aH === 'right' ? rect.right : rect.left + rect.width / 2;

  top += window.scrollY;
  left += window.scrollX;

  const tV = transformOrigin?.vertical ?? 'top';
  const tH = transformOrigin?.horizontal ?? 'left';

  return {
    top,
    left,
    transform: `translate(${tH === 'right' ? '-100%' : tH === 'center' ? '-50%' : '0'}, ${tV === 'bottom' ? '-100%' : '0'})`,
  };
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  { open, onClose, anchorEl, anchorOrigin, transformOrigin, items, minWidth = 180, maxHeight = 320, xstyle, testId, className, style, children },
  ref
) {
  const [pos, setPos] = useState<{ top: number; left: number; transform: string }>({ top: 0, left: 0, transform: '' });

  useEffect(() => {
    if (open && anchorEl) {
      setPos(getMenuPosition(anchorEl, anchorOrigin, transformOrigin));
    }
  }, [open, anchorEl, anchorOrigin, transformOrigin]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const menuEl = (
    <MenuContext.Provider value={{ onClose }}>
      <div aria-hidden="true" className="ui-menu__overlay" onClick={onClose} />
      <div
        ref={ref}
        role="menu"
        aria-orientation="vertical"
        data-testid={testId}
        className={['ui-menu', className].filter(Boolean).join(' ')}
        style={{
          ...pos,
          minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          ...style,
          ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
        }}
      >
        {items ? items.map((item) => <MenuItemComponent key={item.key} item={item} />) : children}
      </div>
    </MenuContext.Provider>
  );

  return createPortal(menuEl, document.body);
});

function MenuItemComponent({ item }: { item: MenuItemData }) {
  const ctx = useContext(MenuContext);

  if (item.divider) {
    return <hr className="ui-menu__divider" />;
  }

  return (
    <div
      role="menuitem"
      tabIndex={item.disabled ? -1 : 0}
      aria-disabled={item.disabled}
      className={['ui-menu-item', item.disabled ? 'ui-menu-item--disabled' : ''].filter(Boolean).join(' ')}
      onClick={item.disabled ? undefined : () => {
        item.onClick?.();
        ctx?.onClose();
      }}
      onKeyDown={(e) => {
        if (!item.disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          item.onClick?.();
          ctx?.onClose();
        }
      }}
    >
      {item.icon && <span aria-hidden="true" className="ui-menu-item__icon">{item.icon}</span>}
      <span className="ui-menu-item__label">{item.label}</span>
      {item.shortcut && <kbd className="ui-menu-item__shortcut">{item.shortcut}</kbd>}
      {item.endContent}
    </div>
  );
}

export interface MenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  shortcut?: string;
  endContent?: React.ReactNode;
  disabled?: boolean;
  selected?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { icon, shortcut, endContent, disabled, selected, xstyle, testId, className, style, children, onClick, ...rest },
  ref
) {
  const ctx = useContext(MenuContext);

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-selected={selected}
      data-testid={testId}
      className={['ui-menu-item', disabled ? 'ui-menu-item--disabled' : '', selected ? 'ui-menu-item--selected' : '', className].filter(Boolean).join(' ')}
      {...(style || (xstyle && !Array.isArray(xstyle)) ? { style: { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) } } : undefined)}
      onClick={disabled ? undefined : (e) => { onClick?.(e); ctx?.onClose(); }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          ctx?.onClose();
        }
      }}
      {...rest}
    >
      {icon && <span aria-hidden="true" className="ui-menu-item__icon">{icon}</span>}
      <span className="ui-menu-item__label">{children}</span>
      {shortcut && <kbd className="ui-menu-item__shortcut">{shortcut}</kbd>}
      {endContent}
    </div>
  );
});

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  count: number;
  page: number;
  onChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  shape?: 'circular' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
  showFirstButton?: boolean;
  showLastButton?: boolean;
  disabled?: boolean;
  color?: string;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

function getPaginationRange(count: number, page: number, siblingCount: number, boundaryCount: number): (number | '...')[] {
  const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const left = Math.max(1, page - siblingCount);
  const right = Math.min(count, page + siblingCount);
  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, 1), count);

  const allPages: (number | '...')[] = [
    ...startPages,
    ...(left > boundaryCount + 2 ? (['...'] as const) : []),
    ...range(Math.max(left, boundaryCount + 1), Math.min(right, count - boundaryCount)),
    ...(right < count - boundaryCount - 1 ? (['...'] as const) : []),
    ...endPages,
  ];

  return [...new Set(allPages)];
}

export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { count, page, onChange, siblingCount = 1, boundaryCount = 1, shape = 'rounded', size = 'md', showFirstButton, showLastButton, disabled, color = 'primary', xstyle, testId, className, style, ...rest },
  ref
) {
  const pages = getPaginationRange(count, page, siblingCount, boundaryCount);

  const btnCls = (active: boolean, dis: boolean) =>
    ['ui-pagination__btn', active && 'ui-pagination__btn--active', dis && 'ui-pagination__btn--disabled'].filter(Boolean).join(' ');

  const activeBgStyle = { '--ui-pagination-active-bg': `var(--ui-color-${color}, var(--ui-color-primary, #4f46e5))` } as React.CSSProperties;

  const userStyle: React.CSSProperties | undefined = (style || (xstyle && !Array.isArray(xstyle)))
    ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
    : undefined;

  return (
    <nav ref={ref} aria-label="pagination" data-testid={testId} data-size={size} className={['ui-pagination', `ui-pagination--${shape}`, className].filter(Boolean).join(' ')} {...(userStyle ? { style: userStyle } : undefined)} {...rest}>
      {showFirstButton && (
        <button type="button" aria-label="First page" disabled={disabled || page === 1} className={btnCls(false, !!disabled || page === 1)} onClick={() => onChange(1)}>«</button>
      )}
      <button type="button" aria-label="Previous page" disabled={disabled || page === 1} className={btnCls(false, !!disabled || page === 1)} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="ui-pagination__ellipsis">…</span>
        ) : (
          <button key={p} type="button" aria-label={`Page ${p}`} aria-current={page === p ? 'page' : undefined} disabled={!!disabled} className={btnCls(page === p, !!disabled)} {...(page === p ? { style: activeBgStyle } : undefined)} onClick={() => onChange(p as number)}>{p}</button>
        )
      )}
      <button type="button" aria-label="Next page" disabled={disabled || page === count} className={btnCls(false, !!disabled || page === count)} onClick={() => onChange(page + 1)}>›</button>
      {showLastButton && (
        <button type="button" aria-label="Last page" disabled={disabled || page === count} className={btnCls(false, !!disabled || page === count)} onClick={() => onChange(count)}>»</button>
      )}
    </nav>
  );
});

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  underline?: 'none' | 'hover' | 'always';
  color?: string;
  external?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { underline = 'hover', color, external, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const linkStyle: React.CSSProperties | undefined = (color || style || (xstyle && !Array.isArray(xstyle)))
    ? {
        ...(color ? { color } : undefined),
        ...style,
        ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
      }
    : undefined;

  return (
    <a
      ref={ref}
      data-testid={testId}
      target={external ? '_blank' : rest.target}
      rel={external ? 'noopener noreferrer' : rest.rel}
      className={['ui-link', `ui-link--underline-${underline}`, className].filter(Boolean).join(' ')}
      {...(linkStyle ? { style: linkStyle } : undefined)}
      {...rest}
    >
      {children}
      {external && <span aria-label=" (opens in new tab)" className="ui-link__external-icon">↗</span>}
    </a>
  );
});

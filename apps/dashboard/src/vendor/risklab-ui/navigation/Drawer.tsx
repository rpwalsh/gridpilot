import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  anchor?: DrawerAnchor;
  variant?: 'temporary' | 'persistent' | 'permanent';
  width?: string | number;
  height?: string | number;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  keepMounted?: boolean;
  hideBackdrop?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
  {
    open,
    onClose,
    anchor = 'left',
    variant = 'temporary',
    width = 280,
    height = 320,
    disableBackdropClick = false,
    disableEscapeKeyDown = false,
    keepMounted = false,
    hideBackdrop = false,
    xstyle,
    testId,
    className,
    style,
    children,
  },
  ref
) {
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement;
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  // Lock body scroll when temporary drawer is open
  useEffect(() => {
    if (!open || variant !== 'temporary') return;
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, variant]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!disableEscapeKeyDown && e.key === 'Escape') onClose();
  }, [disableEscapeKeyDown, onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [open, handleKeyDown]);

  if (!open && !keepMounted && variant === 'temporary') return null;

  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;

  // Only pass the dimension override relevant to this anchor; everything else is CSS.
  const dimensionVars: React.CSSProperties =
    anchor === 'left' || anchor === 'right'
      ? { '--ui-drawer-w': w } as React.CSSProperties
      : { '--ui-drawer-h': h } as React.CSSProperties;

  const mergedStyle: React.CSSProperties = {
    ...dimensionVars,
    ...style,
    ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
  };

  const drawerEl = (
    <div
      className="ui-drawer-container"
      data-open={open ? 'true' : 'false'}
    >
      {!hideBackdrop && variant === 'temporary' && (
        <div
          aria-hidden="true"
          onClick={disableBackdropClick ? undefined : onClose}
          className="ui-drawer-backdrop"
        />
      )}
      <div
        ref={ref}
        role="dialog"
        aria-modal={variant === 'temporary' ? 'true' : undefined}
        data-testid={testId}
        data-open={open ? 'true' : 'false'}
        className={['ui-drawer', `ui-drawer--${anchor}`, className].filter(Boolean).join(' ')}
        style={mergedStyle}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(drawerEl, document.body);
});


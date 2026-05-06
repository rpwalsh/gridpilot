import React, { forwardRef, createContext, useContext, useState, useCallback, useId } from 'react';
import type { SizeVariant, ColorVariant } from '../styling/types';

export interface TabsContextValue {
  value: string;
  onChange: (val: string) => void;
  orientation: 'horizontal' | 'vertical';
  variant: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
  size: SizeVariant;
  color: ColorVariant;
  listId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be used within <Tabs>');
  return ctx;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
  size?: SizeVariant;
  color?: ColorVariant;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value: controlledValue,
    defaultValue = '',
    onChange,
    orientation = 'horizontal',
    variant = 'line',
    size = 'md',
    color = 'primary',
    xstyle,
    testId,
    className,
    style,
    children,
    ...rest
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const listId = useId();
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback((val: string) => {
    if (controlledValue === undefined) setInternalValue(val);
    onChange?.(val);
  }, [controlledValue, onChange]);

  const tabsStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <TabsContext.Provider value={{ value, onChange: handleChange, orientation, variant, size, color, listId }}>
      <div
        ref={ref}
        data-testid={testId}
        className={['ui-tabs', `ui-tabs--${orientation}`, className].filter(Boolean).join(' ')}
        {...(tabsStyle ? { style: tabsStyle } : undefined)}
        {...rest}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
});

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { xstyle, testId, className, style, children, ...rest },
  ref
) {
  const { orientation, variant, listId } = useTabsContext();

  const userStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const isHorizontal = orientation === 'horizontal';
    const prev = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const next = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (e.key !== prev && e.key !== next && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();

    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
    if (tabs.length === 0) return;

    const currentIdx = tabs.indexOf(e.target as HTMLElement);
    let nextIdx = currentIdx;

    if (e.key === prev) nextIdx = currentIdx <= 0 ? tabs.length - 1 : currentIdx - 1;
    else if (e.key === next) nextIdx = currentIdx >= tabs.length - 1 ? 0 : currentIdx + 1;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;

    tabs[nextIdx]?.focus();
  }, [orientation]);

  return (
    <div
      ref={ref}
      id={listId}
      role="tablist"
      aria-orientation={orientation}
      data-variant={variant}
      data-testid={testId}
      className={['ui-tab-list', className].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  value: string;
  icon?: React.ReactNode;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, icon, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const { value: activeValue, onChange, variant, size, color, listId } = useTabsContext();
  const isSelected = value === activeValue;

  const userStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`${listId}-${value}`}
      aria-selected={isSelected ? 'true' : 'false'}
      tabIndex={isSelected ? 0 : -1}
      data-selected={isSelected ? 'true' : undefined}
      data-variant={variant}
      data-color={color}
      data-testid={testId}
      className={[
        'ui-tab',
        `ui-tab--${size}`,
        isSelected ? 'ui-tab--active' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      onClick={() => onChange(value)}
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
});

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  keepMounted?: boolean;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, keepMounted = false, xstyle, testId, className, style, children, ...rest },
  ref
) {
  const { value: activeValue, listId } = useTabsContext();
  const isActive = value === activeValue;

  if (!isActive && !keepMounted) return null;

  const panelStyle: React.CSSProperties | undefined =
    (style || xstyle)
      ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
      : undefined;

  return (
    <div
      ref={ref}
      role="tabpanel"
      aria-labelledby={`${listId}-${value}`}
      tabIndex={0}
      hidden={!isActive}
      data-testid={testId}
      className={['ui-tab-panel', className].filter(Boolean).join(' ')}
      {...(panelStyle ? { style: panelStyle } : undefined)}
      {...rest}
    >
      {children}
    </div>
  );
});

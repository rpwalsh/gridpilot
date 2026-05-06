import React, { forwardRef, useState, useId } from 'react';

export interface AccordionItem {
  id: string;
  summary: React.ReactNode;
  details: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items?: AccordionItem[];
  expandedItems?: string[];
  defaultExpandedItems?: string[];
  onChange?: (expandedIds: string[]) => void;
  allowMultiple?: boolean;
  variant?: 'default' | 'outlined' | 'filled' | 'separated';
  size?: 'sm' | 'md' | 'lg';
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    items = [],
    expandedItems: controlledExpanded,
    defaultExpandedItems = [],
    onChange,
    allowMultiple = false,
    variant = 'default',
    size = 'md',
    xstyle,
    testId,
    className,
    style,
    children,
    ...rest
  },
  ref
) {
  const [internalExpanded, setInternalExpanded] = useState<string[]>(defaultExpandedItems);
  const expanded = controlledExpanded ?? internalExpanded;

  const toggle = (id: string) => {
    let next: string[];
    if (expanded.includes(id)) {
      next = expanded.filter((x) => x !== id);
    } else {
      next = allowMultiple ? [...expanded, id] : [id];
    }
    if (!controlledExpanded) setInternalExpanded(next);
    onChange?.(next);
  };

  const containerStyle: React.CSSProperties | undefined = (style || xstyle)
    ? {
        ...style,
        ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
      }
    : undefined;

  const resolvedItems = items.length > 0 ? items : undefined;

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={['ui-accordion',
        variant === 'outlined' && 'ui-accordion--outlined',
        variant === 'filled' && 'ui-accordion--filled',
        variant === 'separated' && 'ui-accordion--separated',
        className,
      ].filter(Boolean).join(' ')}
      data-size={size}
      {...(containerStyle ? { style: containerStyle } : undefined)}
      {...rest}
    >      {resolvedItems ? resolvedItems.map((item, i) => (
        <AccordionItemEl
          key={item.id}
          item={item}
          isExpanded={expanded.includes(item.id)}
          onToggle={toggle}
          variant={variant}
          isLast={i === resolvedItems.length - 1}
        />
      )) : children}
    </div>
  );
});

interface AccordionItemElProps {
  item: AccordionItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  variant: string;
  isLast: boolean;
}

function AccordionItemEl({ item, isExpanded, onToggle, variant, isLast }: AccordionItemElProps) {
  const panelId = useId();
  const headingId = useId();

  return (
    <div className={variant === 'separated' ? 'ui-accordion-item--separated' : undefined}>
      <button
        type="button"
        id={headingId}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        disabled={item.disabled}
        onClick={() => onToggle(item.id)}
        className={[
          'ui-accordion-header',
          item.disabled && 'ui-accordion-header--disabled',
          variant === 'filled' && 'ui-accordion-header--filled',
          variant !== 'separated' && !isLast && 'ui-accordion-header--border',
        ].filter(Boolean).join(' ')}
      >
        <span>{item.summary}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          width="1em"
          height="1em"
          aria-hidden="true"
          className={['ui-accordion-header__icon', isExpanded && 'ui-accordion-header__icon--expanded'].filter(Boolean).join(' ')}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!isExpanded}
        className={[
          'ui-accordion-panel',
          !isLast && variant !== 'separated' && 'ui-accordion-panel--border-bottom',
        ].filter(Boolean).join(' ')}
      >
        {item.details}
      </div>
    </div>
  );
}

export interface AccordionSummaryProps extends React.HTMLAttributes<HTMLButtonElement> {
  expandIcon?: React.ReactNode;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const AccordionSummary = forwardRef<HTMLButtonElement, AccordionSummaryProps>(function AccordionSummary(
  { expandIcon, xstyle, testId, className, style, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      data-testid={testId}
      className={['ui-accordion-summary', className].filter(Boolean).join(' ')}
      {...((style || xstyle) ? { style: {
        ...style,
        ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
      } } : undefined)}
      {...rest}
    >
      {children}
      {expandIcon}
    </button>
  );
});

export interface AccordionDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const AccordionDetails = forwardRef<HTMLDivElement, AccordionDetailsProps>(function AccordionDetails(
  { xstyle, testId, className, style, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      data-testid={testId}
      className={['ui-accordion-details', className].filter(Boolean).join(' ')}
      {...((style || xstyle) ? { style: {
        ...style,
        ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}),
      } } : undefined)}
      {...rest}
    >
      {children}
    </div>
  );
});

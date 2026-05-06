import React, { forwardRef } from 'react';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLSpanElement>;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  expandText?: string;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  { items, separator = '/', maxItems, expandText = '...', xstyle, testId, className, style, ...rest },
  ref
) {
  const [expanded, setExpanded] = React.useState(false);
  const shouldCollapse = maxItems !== undefined && items.length > maxItems && !expanded;
  const expandItem: BreadcrumbItem = { label: <button type="button" onClick={() => setExpanded(true)} aria-label={expandText} className="ui-breadcrumbs__expand-btn">{expandText}</button> };
  const visibleItems: BreadcrumbItem[] = shouldCollapse && maxItems !== undefined
    ? [items[0], expandItem, ...items.slice(items.length - (maxItems - 1))]
    : items;

  const userStyle: React.CSSProperties | undefined = (style || xstyle)
    ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
    : undefined;

  return (
    <nav
      ref={ref}
      aria-label="breadcrumb"
      data-testid={testId}
      className={['ui-breadcrumbs', className].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      {...rest}
    >
      <ol className="ui-breadcrumbs__list">
        {visibleItems.map((item, i) => {
          const isLast = i === visibleItems.length - 1;
          return (
            <li key={i} className="ui-breadcrumbs__item">
              {isLast ? (
                <span aria-current="page" className="ui-breadcrumbs__current">
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <a
                      href={item.href}
                      onClick={item.onClick as React.MouseEventHandler<HTMLAnchorElement>}
                      className="ui-breadcrumbs__link"
                    >
                      {item.label}
                    </a>
                  ) : React.isValidElement(item.label) ? item.label : (
                    <span onClick={item.onClick as React.MouseEventHandler<HTMLSpanElement>} className={item.onClick ? 'ui-breadcrumbs__link' : undefined}>
                      {item.label}
                    </span>
                  )}
                  <span aria-hidden="true" className="ui-breadcrumbs__separator">
                    {separator}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

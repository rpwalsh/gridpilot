import React, { forwardRef } from 'react';
import type { ColorVariant } from '../styling/types';

export type TimelineAlign = 'left' | 'right' | 'alternate';

export interface TimelineItemData {
  id?: string;
  dot?: React.ReactNode;
  color?: ColorVariant | string;
  content: React.ReactNode;
  opposite?: React.ReactNode;
  time?: React.ReactNode;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: TimelineItemData[];
  align?: TimelineAlign;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  { items = [], align = 'left', xstyle, testId, className, style, children, ...rest },
  ref
) {
  const userStyle: React.CSSProperties | undefined = (style || (xstyle && !Array.isArray(xstyle)))
    ? { ...style, ...(xstyle && !Array.isArray(xstyle) ? xstyle as React.CSSProperties : {}) }
    : undefined;

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={['ui-timeline', className].filter(Boolean).join(' ')}
      {...(userStyle ? { style: userStyle } : undefined)}
      {...rest}
    >
      {items.length > 0 ? items.map((item, i) => (
        <TimelineItem key={item.id ?? i} item={item} align={align} isLast={i === items.length - 1} />
      )) : children}
    </div>
  );
});

interface TimelineItemInternalProps {
  item: TimelineItemData;
  align: TimelineAlign;
  isLast: boolean;
}

function TimelineItem({ item, align, isLast }: TimelineItemInternalProps) {
  const isRight = align === 'right';
  const colorVar = item.color
    ? item.color.startsWith('#') || item.color.startsWith('rgb') || item.color.startsWith('var')
      ? item.color
      : `var(--ui-color-${item.color}, var(--ui-color-primary, #4f46e5))`
    : undefined;

  const oppositeCls = [
    'ui-timeline-item__opposite',
    align === 'alternate' && 'ui-timeline-item__opposite--alternate',
    isRight ? 'ui-timeline-item__opposite--right' : 'ui-timeline-item__opposite--left',
  ].filter(Boolean).join(' ');

  return (
    <div className={['ui-timeline-item', isRight && 'ui-timeline-item--reverse'].filter(Boolean).join(' ')}>
      {/* Opposite content */}
      <div className={oppositeCls}>
        {item.opposite}
      </div>

      {/* Dot + connector */}
      <div className="ui-timeline-item__gutter">
        <div
          className="ui-timeline-item__dot"
          {...(colorVar ? { style: { '--ui-timeline-dot-color': colorVar } as React.CSSProperties } : undefined)}
        >
          {item.dot}
        </div>
        {!isLast && (
          <div className="ui-timeline-item__connector" />
        )}
      </div>

      {/* Main content */}
      <div className={['ui-timeline-item__content', isLast && 'ui-timeline-item__content--last'].filter(Boolean).join(' ')}>
        {item.time && (
          <div className="ui-timeline-item__time">
            {item.time}
          </div>
        )}
        {item.content}
      </div>
    </div>
  );
}

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  dot?: React.ReactNode;
  color?: ColorVariant | string;
  opposite?: React.ReactNode;
  time?: React.ReactNode;
  xstyle?: Record<string, string | number> | Array<Record<string, string | number> | false | null | undefined>;
  testId?: string;
}

export const TimelineContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function TimelineContent(props, ref) {
  return <div ref={ref} {...props} />;
});

export const TimelineDot = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { color?: string }>(function TimelineDot({ color, style, className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={['ui-timeline-dot', className].filter(Boolean).join(' ')}
      {...(color || style ? { style: { ...(color ? { background: color } : undefined), ...style } } : undefined)}
      {...props}
    />
  );
});

export const TimelineConnector = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function TimelineConnector({ className, style, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={['ui-timeline-connector', className].filter(Boolean).join(' ')}
      {...(style ? { style } : undefined)}
      {...props}
    />
  );
});

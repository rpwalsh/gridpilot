// @risklab/ui � Card component

import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from 'react';
import type { BaseProps } from '../styling/types';
import { cx } from '../styling/cx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeXStyle(
  xstyle: BaseProps['xstyle'],
): Record<string, string | number> | undefined {
  if (!xstyle) return undefined;
  if (typeof xstyle === 'object' && !Array.isArray(xstyle))
    return xstyle as Record<string, string | number>;
  if (Array.isArray(xstyle))
    return xstyle.reduce<Record<string, string | number>>(
      (a, s) => (s ? { ...a, ...s } : a),
      {},
    );
  return undefined;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLElement>, 'style' | 'className' | 'onClick'> {
  /** Visual variant. */
  variant?: CardVariant;
  /** Enable hover/focus interaction styles. */
  interactive?: boolean;
  /** Click handler � makes the card focusable. */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** If provided, the card renders as an anchor. */
  href?: string;
  children?: ReactNode;
}

export interface CardHeaderProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className' | 'title'> {
  /** Title text or element. */
  title?: ReactNode;
  /** Subtitle text. */
  subtitle?: ReactNode;
  /** Action slot (top-right). */
  action?: ReactNode;
  /** Avatar slot (left). */
  avatar?: ReactNode;
  children?: ReactNode;
}

export interface CardMediaProps
  extends BaseProps,
    Omit<ImgHTMLAttributes<HTMLImageElement>, 'style' | 'className'> {
  /** Image source. */
  src?: string;
  /** Alt text. */
  alt?: string;
  /** Fixed height for the media area. */
  height?: string | number;
  /** Render a video element instead of img. */
  component?: 'img' | 'video';
  children?: ReactNode;
}

export interface CardContentProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  children?: ReactNode;
}

export interface CardActionsProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Push actions apart (space-between vs flex-end). */
  disableSpacing?: boolean;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

// Variant styles now live in ui.css: .ui-card--elevated, .ui-card--outlined, .ui-card--filled

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export const Card = forwardRef<HTMLElement, CardProps>(
  function Card(
    {
      variant = 'elevated',
      interactive = false,
      onClick,
      href,
      className,
      style,
      xstyle,
      testId,
      children,
      ...rest
    },
    ref,
  ) {
    const Component: ElementType = href ? 'a' : 'article';
    const isClickable = interactive || !!onClick || !!href;

    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? { ...mergeXStyle(xstyle), ...style }
      : undefined;

    const elementProps: Record<string, unknown> = {
      ref,
      className: cx('ui-card', `ui-card--${variant}`, interactive && 'ui-card--interactive', className),
      ...(userStyle ? { style: userStyle } : undefined),
      'data-testid': testId,
      'data-variant': variant,
      ...rest,
    };

    if (href) {
      elementProps.href = href;
    }
    if (onClick) {
      elementProps.onClick = onClick;
    }
    if (isClickable && !href) {
      elementProps.tabIndex = 0;
      elementProps.role = 'button';
      elementProps.onKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLElement>);
        }
      };
    }

    return <Component {...elementProps}>{children}</Component>;
  },
);

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader(
    { title, subtitle, action, avatar, className, style, xstyle, testId, children, ...rest },
    ref,
  ) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? { ...mergeXStyle(xstyle), ...style }
      : undefined;

    return (
      <div
        ref={ref}
        className={cx('ui-card-header', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {avatar && (
          <div className="ui-card-header__avatar">
            {avatar}
          </div>
        )}
        <div className="ui-card-header__text">
          {title && (
            <div className="ui-card-header__title">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="ui-card-header__subtitle">
              {subtitle}
            </div>
          )}
        </div>
        {action && (
          <div className="ui-card-header__action">
            {action}
          </div>
        )}
        {children}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// CardMedia
// ---------------------------------------------------------------------------

export const CardMedia = forwardRef<HTMLImageElement, CardMediaProps>(
  function CardMedia(
    { src, alt, height, component = 'img', className, style, xstyle, testId, children, ...rest },
    ref,
  ) {
    const userStyle: CSSProperties | undefined = (xstyle || style || height != null)
      ? {
          ...(height != null ? { height } : undefined),
          ...mergeXStyle(xstyle),
          ...style,
        }
      : undefined;

    if (component === 'video') {
      return (
        <video
          ref={ref as React.Ref<HTMLVideoElement>}
          className={cx('ui-card-media', className)}
          {...(userStyle ? { style: userStyle } : undefined)}
          src={src}
          data-testid={testId}
          {...(rest as Record<string, unknown>)}
        >
          {children}
        </video>
      );
    }

    return (
      <img
        ref={ref}
        className={cx('ui-card-media', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        src={src}
        alt={alt ?? ''}
        data-testid={testId}
        {...rest}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// CardContent
// ---------------------------------------------------------------------------

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, style, xstyle, testId, children, ...rest }, ref) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? { ...mergeXStyle(xstyle), ...style }
      : undefined;

    return (
      <div
        ref={ref}
        className={cx('ui-card-content', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// CardActions
// ---------------------------------------------------------------------------

export const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(
  function CardActions(
    { disableSpacing = false, className, style, xstyle, testId, children, ...rest },
    ref,
  ) {
    const userStyle: CSSProperties | undefined = (xstyle || style)
      ? { ...mergeXStyle(xstyle), ...style }
      : undefined;

    return (
      <div
        ref={ref}
        className={cx('ui-card-actions', disableSpacing && 'ui-card-actions--no-spacing', className)}
        {...(userStyle ? { style: userStyle } : undefined)}
        data-testid={testId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

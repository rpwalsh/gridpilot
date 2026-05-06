// @risklab/ui — Typography component

import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import type { ColorVariant, BaseProps } from '../styling/types';
import { cx } from '../styling/cx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline'
  | 'code'
  | 'kbd'
  | 'mark';

export type TypographyWeight =
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold';

export type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

export interface TypographyProps
  extends BaseProps,
    Omit<HTMLAttributes<HTMLElement>, 'style' | 'className' | 'color'> {
  /** Typographic variant that controls size, weight, and default element. */
  variant?: TypographyVariant;
  /** Override the rendered element type. Auto-derived from variant if not set. */
  as?: ElementType;
  /** Text color — a ColorVariant token, 'inherit', or arbitrary CSS color. */
  color?: ColorVariant | 'inherit' | (string & {});
  /** Text alignment. */
  align?: TypographyAlign;
  /** Truncate text with ellipsis on a single line. */
  noWrap?: boolean;
  /** Add bottom margin (0.35em). */
  gutterBottom?: boolean;
  /** Font weight override. */
  weight?: TypographyWeight;
  /** Render in italic. */
  italic?: boolean;
  /** Render with underline. */
  underline?: boolean;
  /** Multi-line truncation — clamp to N lines. */
  lineClamp?: number;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Variant ? default element mapping
// ---------------------------------------------------------------------------

const VARIANT_ELEMENT_MAP: Record<TypographyVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'h6',
  subtitle2: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
  code: 'code',
  kbd: 'kbd',
  mark: 'mark',
};

// ---------------------------------------------------------------------------
// Variant ? CSS custom property tokens
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<TypographyVariant, CSSProperties> = {
  h1: {
    '--ui-typo-font-size': 'var(--ui-typo-h1-size, 2.5rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h1-weight, 700)',
    '--ui-typo-line-height': 'var(--ui-typo-h1-lh, 1.2)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h1-ls, -0.02em)',
  } as CSSProperties,
  h2: {
    '--ui-typo-font-size': 'var(--ui-typo-h2-size, 2rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h2-weight, 700)',
    '--ui-typo-line-height': 'var(--ui-typo-h2-lh, 1.25)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h2-ls, -0.015em)',
  } as CSSProperties,
  h3: {
    '--ui-typo-font-size': 'var(--ui-typo-h3-size, 1.75rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h3-weight, 600)',
    '--ui-typo-line-height': 'var(--ui-typo-h3-lh, 1.3)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h3-ls, -0.01em)',
  } as CSSProperties,
  h4: {
    '--ui-typo-font-size': 'var(--ui-typo-h4-size, 1.5rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h4-weight, 600)',
    '--ui-typo-line-height': 'var(--ui-typo-h4-lh, 1.35)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h4-ls, -0.005em)',
  } as CSSProperties,
  h5: {
    '--ui-typo-font-size': 'var(--ui-typo-h5-size, 1.25rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h5-weight, 600)',
    '--ui-typo-line-height': 'var(--ui-typo-h5-lh, 1.4)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h5-ls, 0)',
  } as CSSProperties,
  h6: {
    '--ui-typo-font-size': 'var(--ui-typo-h6-size, 1.125rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-h6-weight, 600)',
    '--ui-typo-line-height': 'var(--ui-typo-h6-lh, 1.4)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-h6-ls, 0)',
  } as CSSProperties,
  subtitle1: {
    '--ui-typo-font-size': 'var(--ui-typo-subtitle1-size, 1rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-subtitle1-weight, 500)',
    '--ui-typo-line-height': 'var(--ui-typo-subtitle1-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-subtitle1-ls, 0.01em)',
  } as CSSProperties,
  subtitle2: {
    '--ui-typo-font-size': 'var(--ui-typo-subtitle2-size, 0.875rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-subtitle2-weight, 500)',
    '--ui-typo-line-height': 'var(--ui-typo-subtitle2-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-subtitle2-ls, 0.01em)',
  } as CSSProperties,
  body1: {
    '--ui-typo-font-size': 'var(--ui-typo-body1-size, 1rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-body1-weight, 400)',
    '--ui-typo-line-height': 'var(--ui-typo-body1-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-body1-ls, 0)',
  } as CSSProperties,
  body2: {
    '--ui-typo-font-size': 'var(--ui-typo-body2-size, 0.875rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-body2-weight, 400)',
    '--ui-typo-line-height': 'var(--ui-typo-body2-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-body2-ls, 0)',
  } as CSSProperties,
  caption: {
    '--ui-typo-font-size': 'var(--ui-typo-caption-size, 0.75rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-caption-weight, 400)',
    '--ui-typo-line-height': 'var(--ui-typo-caption-lh, 1.4)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-caption-ls, 0.02em)',
  } as CSSProperties,
  overline: {
    '--ui-typo-font-size': 'var(--ui-typo-overline-size, 0.75rem)',
    '--ui-typo-font-weight': 'var(--ui-typo-overline-weight, 600)',
    '--ui-typo-line-height': 'var(--ui-typo-overline-lh, 1.4)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-overline-ls, 0.08em)',
    textTransform: 'uppercase',
  } as CSSProperties,
  code: {
    '--ui-typo-font-size': 'var(--ui-typo-code-size, 0.875em)',
    '--ui-typo-font-weight': 'var(--ui-typo-code-weight, 400)',
    '--ui-typo-line-height': 'var(--ui-typo-code-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-code-ls, 0)',
    fontFamily: 'var(--ui-font-mono, ui-monospace, "Cascadia Code", "Fira Code", monospace)',
    backgroundColor: 'var(--ui-typo-code-bg, rgba(0,0,0,0.06))',
    padding: '0.15em 0.35em',
    borderRadius: 'var(--ui-typo-code-radius, 0.25em)',
  } as CSSProperties,
  kbd: {
    '--ui-typo-font-size': 'var(--ui-typo-kbd-size, 0.875em)',
    '--ui-typo-font-weight': 'var(--ui-typo-kbd-weight, 400)',
    '--ui-typo-line-height': 'var(--ui-typo-kbd-lh, 1.5)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-kbd-ls, 0)',
    fontFamily: 'var(--ui-font-mono, ui-monospace, "Cascadia Code", "Fira Code", monospace)',
    backgroundColor: 'var(--ui-typo-kbd-bg, rgba(0,0,0,0.06))',
    padding: '0.15em 0.4em',
    border: '1px solid var(--ui-typo-kbd-border, rgba(0,0,0,0.15))',
    borderRadius: 'var(--ui-typo-kbd-radius, 0.25em)',
    boxShadow: 'var(--ui-typo-kbd-shadow, 0 1px 0 rgba(0,0,0,0.1))',
  } as CSSProperties,
  mark: {
    '--ui-typo-font-size': 'var(--ui-typo-mark-size, inherit)',
    '--ui-typo-font-weight': 'var(--ui-typo-mark-weight, inherit)',
    '--ui-typo-line-height': 'var(--ui-typo-mark-lh, inherit)',
    '--ui-typo-letter-spacing': 'var(--ui-typo-mark-ls, 0)',
    backgroundColor: 'var(--ui-typo-mark-bg, #fef08a)',
    padding: '0.05em 0.2em',
    borderRadius: 'var(--ui-typo-mark-radius, 0.15em)',
  } as CSSProperties,
};

// ---------------------------------------------------------------------------
// Weight map
// ---------------------------------------------------------------------------

const WEIGHT_MAP: Record<TypographyWeight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const COLOR_TOKEN_MAP: Record<ColorVariant, string> = {
  primary: 'var(--ui-color-primary, #3b82f6)',
  secondary: 'var(--ui-color-secondary, #6366f1)',
  success: 'var(--ui-color-success, #22c55e)',
  warning: 'var(--ui-color-warning, #f59e0b)',
  error: 'var(--ui-color-error, #ef4444)',
  info: 'var(--ui-color-info, #06b6d4)',
  neutral: 'var(--ui-color-neutral, #6b7280)',
};

const SEMANTIC_COLORS = new Set<string>(Object.keys(COLOR_TOKEN_MAP));

function resolveColor(color: string | undefined): string | undefined {
  if (!color || color === 'inherit') return color;
  if (SEMANTIC_COLORS.has(color)) return COLOR_TOKEN_MAP[color as ColorVariant];
  return color;
}

// ---------------------------------------------------------------------------
// Base styles
// ---------------------------------------------------------------------------

const baseStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  fontSize: 'var(--ui-typo-font-size)',
  fontWeight: 'var(--ui-typo-font-weight)' as CSSProperties['fontWeight'],
  lineHeight: 'var(--ui-typo-line-height)',
  letterSpacing: 'var(--ui-typo-letter-spacing)',
  fontFamily: 'var(--ui-font-family, inherit)',
  color: 'var(--ui-typo-color, inherit)',
  boxSizing: 'border-box',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  function Typography(
    {
      variant = 'body1',
      as,
      color,
      align,
      noWrap = false,
      gutterBottom = false,
      weight,
      italic = false,
      underline = false,
      lineClamp,
      className,
      style,
      xstyle,
      testId,
      children,
      ...rest
    },
    ref,
  ) {
    const Component: ElementType = as ?? VARIANT_ELEMENT_MAP[variant];

    const resolvedColor = resolveColor(color);

    const resolvedStyle: CSSProperties = {
      ...baseStyle,
      ...VARIANT_STYLES[variant],
      ...(resolvedColor != null
        ? { '--ui-typo-color': resolvedColor, color: 'var(--ui-typo-color)' } as CSSProperties
        : undefined),
      ...(align ? { textAlign: align } : undefined),
      ...(weight ? { fontWeight: WEIGHT_MAP[weight] } : undefined),
      ...(italic ? { fontStyle: 'italic' } : undefined),
      ...(underline ? { textDecoration: 'underline' } : undefined),
      ...(gutterBottom ? { marginBottom: '0.35em' } : undefined),
      ...(noWrap
        ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
        : undefined),
      ...(lineClamp != null && lineClamp > 0
        ? {
            display: '-webkit-box',
            WebkitLineClamp: lineClamp,
            WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'],
            overflow: 'hidden',
          }
        : undefined),
      ...(typeof xstyle === 'object' && !Array.isArray(xstyle) ? xstyle : undefined),
      ...(Array.isArray(xstyle)
        ? xstyle.reduce<Record<string, string | number>>(
            (acc, s) => (s ? { ...acc, ...s } : acc),
            {},
          )
        : undefined),
      ...style,
    };

    return (
      <Component
        ref={ref}
        className={cx('ui-typography', `ui-typography--${variant}`, className)}
        style={resolvedStyle}
        data-testid={testId}
        data-variant={variant}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

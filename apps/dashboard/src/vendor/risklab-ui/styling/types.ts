// @risklab/ui — Shared prop types for the styling system

import type { CSSProperties } from 'react';
import type { XStyleProp } from './stylex-compat';

// ---------------------------------------------------------------------------
// Variant unions
// ---------------------------------------------------------------------------

/** Standard size scale used across @risklab/ui components. */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Semantic colour variants mapped to theme colour scales. */
export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'neutral';

// ---------------------------------------------------------------------------
// Base props shared by every @risklab/ui component
// ---------------------------------------------------------------------------

/**
 * Common props inherited by all @risklab/ui components.
 *
 * - `className` — additional CSS class(es)
 * - `style` — inline React CSSProperties
 * - `xstyle` — StyleX / xstyle compatible style prop
 * - `id` — HTML `id` attribute
 * - `testId` — maps to `data-testid` for testing
 */
export interface BaseProps {
  className?: string;
  style?: CSSProperties;
  xstyle?: XStyleProp;
  id?: string;
  testId?: string;
}

// ---------------------------------------------------------------------------
// Re-export XStyleProp for convenience
// ---------------------------------------------------------------------------

export type { XStyleProp };

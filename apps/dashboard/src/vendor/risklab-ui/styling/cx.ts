// @risklab/ui — cx() className merging utility
// Filters falsy values, deduplicates classes, returns a single string.

type CxInput = string | false | null | undefined | 0 | '';

/**
 * Merge class names into a single deduplicated string.
 *
 * ```ts
 * cx('a', false, 'b', undefined, 'a') // ? 'a b'
 * ```
 */
export function cx(...classes: ReadonlyArray<CxInput>): string {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of classes) {
    if (!entry) continue;
    // Split on whitespace so callers can pass compound strings like "foo bar"
    const parts = entry.split(/\s+/);
    for (const part of parts) {
      if (part && !seen.has(part)) {
        seen.add(part);
        result.push(part);
      }
    }
  }

  return result.join(' ');
}

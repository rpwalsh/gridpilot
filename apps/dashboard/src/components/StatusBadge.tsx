type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate' | 'orange'

interface StatusBadgeProps {
  label: string
  color?: BadgeColor
}

const BADGE_COLORS: Record<string, BadgeColor> = {
  // trust / status
  high: 'green', medium: 'amber', low: 'amber', very_low: 'red',
  // drift
  none: 'green', critical: 'red',
  // priority
  immediate: 'red', within_24h: 'orange', within_week: 'amber', monitor: 'slate',
  // enabled/disabled
  enabled: 'green', disabled: 'slate',
  // action
  charge: 'green', discharge: 'red', hold: 'slate',
  // provider status
  success: 'green', fixture: 'blue', degraded: 'amber', error: 'red',
  unconfigured: 'slate', unreachable: 'red', configured_not_called: 'purple',
  configured_not_probed: 'purple', fixture_not_found: 'red',
}

export function resolveColor(key: string): BadgeColor {
  return BADGE_COLORS[key.toLowerCase()] ?? 'blue'
}

export default function StatusBadge({ label, color }: StatusBadgeProps) {
  const c = color ?? resolveColor(label)
  return <span className={`gp-badge gp-badge--${c}`}>{label.replace(/_/g, ' ')}</span>
}

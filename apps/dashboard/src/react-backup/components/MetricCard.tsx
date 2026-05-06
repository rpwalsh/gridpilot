/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: string
  status?: 'good' | 'warning' | 'error'
  description?: string
}

export default function MetricCard({ label, value, unit = '', icon, status = 'good', description }: MetricCardProps) {
  const statusColor = {
    good: '#66bb6a',
    warning: '#ffa726',
    error: '#ef5350',
  }[status]

  return (
    <div className="metric-card" style={{ borderLeftColor: statusColor }}>
      <div className="metric-card__header">
        {icon && <div className="metric-card__icon">{icon}</div>}
        <div className="metric-card__label">{label}</div>
      </div>
      <div className="metric-card__value">
        {value}
        {unit && <span className="metric-card__unit">{unit}</span>}
      </div>
      {description && <div className="metric-card__description">{description}</div>}
    </div>
  )
}

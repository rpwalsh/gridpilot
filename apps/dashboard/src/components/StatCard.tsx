interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: React.ReactNode
}

export default function StatCard({ label, value, sub, accent = 'var(--gp-blue)' }: StatCardProps) {
  return (
    <div className="gp-stat" style={{ '--gp-stat-accent': accent } as React.CSSProperties}>
      <div className="gp-stat__label">{label}</div>
      <div className="gp-stat__value">{value}</div>
      {sub && <div className="gp-stat__sub">{sub}</div>}
    </div>
  )
}

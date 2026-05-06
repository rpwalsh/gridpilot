interface Finding {
  recommendation_id: string
  type: string
  asset_id: string
  title: string
  urgency: string
  confidence: number
}

const URGENCY_COLORS: Record<string, string> = {
  immediate:    '#ef4444',
  within_24h:   '#f97316',
  within_week:  '#eab308',
  monitor:      '#22c55e',
}

export default function FindingsTable({ recommendations }: { recommendations: Finding[] }) {
  if (!recommendations.length) return null
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Finding</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Asset</th>
          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Severity</th>
          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Confidence</th>
        </tr>
      </thead>
      <tbody>
        {recommendations.map(r => (
          <tr key={r.recommendation_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '0.5rem' }}>{r.title}</td>
            <td style={{ padding: '0.5rem', color: '#64748b' }}>{r.asset_id}</td>
            <td style={{ padding: '0.5rem' }}>
              <span style={{
                background: URGENCY_COLORS[r.urgency] || '#94a3b8',
                color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem',
              }}>
                {r.urgency.replace(/_/g, ' ')}
              </span>
            </td>
            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(r.confidence * 100).toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

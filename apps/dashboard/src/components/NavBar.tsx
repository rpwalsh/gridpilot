import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/evaluate', label: 'Site Evaluation' },
  { path: '/forecast', label: 'Forecast' },
  { path: '/health', label: 'Asset Health' },
  { path: '/dispatch', label: 'Dispatch' },
  { path: '/recommendations', label: 'Recommendations' },
  { path: '/audit', label: 'Audit Trail' },
]

export default function NavBar() {
  const location = useLocation()
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.75rem 1.5rem', background: '#1e293b', color: '#f8fafc'
    }}>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: '1rem' }}>⚡ GridForge</span>
      {NAV_ITEMS.map(item => (
        <Link
          key={item.path}
          to={item.path}
          style={{
            color: location.pathname === item.path ? '#38bdf8' : '#cbd5e1',
            textDecoration: 'none', fontWeight: location.pathname === item.path ? 600 : 400
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

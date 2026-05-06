import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/portfolio',  label: 'System Overview' },
  { path: '/evaluate',   label: 'Snapshot Analysis' },
  { path: '/telemetry',  label: 'Telemetry' },
  { path: '/health',     label: 'Asset State' },
  { path: '/forecast',   label: 'Forecast Context' },
  { path: '/dispatch',   label: 'Dispatch Analysis' },
  { path: '/audit',      label: 'Audit Trace' },
  { path: '/providers',  label: 'Provider Status' },
]

export default function NavBar() {
  const location = useLocation()
  return (
    <nav className="gp-nav">
      <span className="gp-nav__brand">
        <span className="gp-nav__brand-icon">DL</span>
        Dispatch Layer
      </span>
      <div className="gp-nav__links">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`gp-nav__link${location.pathname === item.path ? ' gp-nav__link--active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}


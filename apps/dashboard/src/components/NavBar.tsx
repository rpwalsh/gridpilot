import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/evaluate', label: 'Site Eval' },
  { path: '/forecast', label: 'Forecast' },
  { path: '/health', label: 'Asset Health' },
  { path: '/dispatch', label: 'Dispatch' },
  { path: '/recommendations', label: 'Recs' },
  { path: '/audit', label: 'Audit Trail' },
]

export default function NavBar() {
  const location = useLocation()
  return (
    <nav className="gp-nav">
      <span className="gp-nav__brand">
        <span className="gp-nav__brand-icon">DL</span>
        DispatchLayer
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


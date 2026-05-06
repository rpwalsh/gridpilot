/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useLocation, Link } from 'react-router-dom'

const nav_items = [
  { label: 'Sources', path: '/sources' },
  { label: 'History', path: '/history' },
  { label: 'Replay', path: '/replay' },
  { label: 'Bands', path: '/bands' },
  { label: 'Charts', path: '/charts' },
]

export default function NavRail() {
  const location = useLocation()

  return (
    <nav className="gp-shell__nav">
      <div className="gp-nav-rail">
        <Link to="/" className="gp-nav-rail__brand">
          <div className="gp-nav-rail__brand-icon">âš¡</div>
          <span>DispatchLayer</span>
        </Link>

        {nav_items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`gp-nav-rail__item ${location.pathname === item.path ? 'gp-nav-rail__item--active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

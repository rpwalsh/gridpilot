/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { path: '/portfolio',  label: 'Overview'          },
  { path: '/telemetry',  label: 'Telemetry'          },
  { path: '/forecast',   label: 'Forecast'           },
  { path: '/proofs',     label: 'Proofs'             },
  { path: '/health',     label: 'Asset State'        },
  { path: '/evaluate',   label: 'Site Analysis'      },
  { path: '/dispatch',   label: 'Dispatch'           },
  { path: '/pipeline',   label: 'Pipeline'           },
  { path: '/providers',  label: 'Source Status'      },
  { path: '/audit',      label: 'Audit'              },
]

function LiveTime() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{t.toISOString().replace('T', ' ').slice(0, 19)}</>
}

export default function NavBar() {
  const location = useLocation()
  return (
    <nav className="gp-nav" style={{ height: 'auto', flexDirection: 'column', padding: 0 }}>
      {/* Top strip */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: 44, padding: '0 1.25rem', gap: '1rem', borderBottom: 'rgba(34,197,94,0.08) 1px solid' }}>
        <Link to="/telemetry" className="gp-nav__brand" style={{ marginRight: '0.5rem', textDecoration: 'none' }}>
          <span className="gp-nav__brand-icon" style={{ fontSize: 13 }}>DL</span>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1, color: '#f8fafc' }}>Dispatch Layer</div>
            <div style={{ fontSize: '0.6rem', color: '#4a7a4a', fontWeight: 500, lineHeight: 1, marginTop: 1 }}>
              Source-backed dashboard
            </div>
          </div>
        </Link>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#4a7a4a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            UTC
          </div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d4f0d4', fontFamily: 'monospace' }}>
            <LiveTime />
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', padding: '0 1rem', height: 36, overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`gp-nav__link${location.pathname === item.path ? ' gp-nav__link--active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

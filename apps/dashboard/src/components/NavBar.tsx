import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { path: '/portfolio', label: 'Overview' },
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
      {/* ── Top strip: brand + status ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: 44, padding: '0 1.25rem', gap: '1rem', borderBottom: 'rgba(34,197,94,0.08) 1px solid' }}>

        {/* Brand */}
        <Link to="/portfolio" className="gp-nav__brand" style={{ marginRight: '0.5rem', textDecoration: 'none' }}>
          <span className="gp-nav__brand-icon" style={{ fontSize: 13 }}>DL</span>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1, color: '#f8fafc' }}>Dispatch Layer</div>
            <div style={{ fontSize: '0.6rem', color: '#4a7a4a', fontWeight: 500, lineHeight: 1, marginTop: 1 }}>
              Plant Data Display
            </div>
          </div>
        </Link>

        <div style={{ width: 1, height: 24, background: 'rgba(34,197,94,0.15)' }} />

        {/* Status pills */}
        <div style={{ display: 'flex', gap: '1.2rem', flex: 1, overflow: 'hidden' }}>
          <StatusPill label="Grid Scope" val="ERCOT" />
          <StatusPill label="System Time (UTC)" val={<LiveTime />} mono />
          <StatusPill label="Market" val="DAM" />
          <StatusPill label="Interval" val="15m" />
        </div>

        {/* Alerts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <AlertChip label="ALM" count={2} color="#f87171" />
          <AlertChip label="WRN" count={5} color="#fbbf24" />
          <div style={{ fontSize: '0.72rem', color: '#7ab87a', fontWeight: 600, paddingLeft: 8, borderLeft: 'rgba(34,197,94,0.15) 1px solid' }}>
            OPS_CTRL ▾
          </div>
        </div>
      </div>

      {/* ── Nav links ────────────────────────────────────────────────────── */}
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

function StatusPill({ label, val, mono }: { label: string; val: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ fontSize: '0.55rem', color: '#4a7a4a', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1 }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.72rem', fontWeight: 700, color: '#d4f0d4', lineHeight: 1,
        fontFamily: mono ? 'monospace' : undefined,
      }}>
        {val}
      </div>
    </div>
  )
}

function AlertChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{count}</span>
    </div>
  )
}



import { useLocation } from 'react-router-dom'

export default function NotConnected() {
  const { pathname } = useLocation()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '0.75rem',
      color: '#4a7a4a',
      fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#f87171', fontWeight: 700 }}>
        NOT_CONNECTED
      </div>
      <div style={{ fontSize: '0.85rem', color: '#7ab87a' }}>
        {pathname}
      </div>
      <div style={{
        fontSize: '0.68rem',
        color: '#4a7a4a',
        maxWidth: 420,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        This section requires a live data connection that is not present in the demo.
        No placeholder data is shown here.
      </div>
    </div>
  )
}

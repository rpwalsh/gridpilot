import React from 'react'

interface DashboardCardProps {
  title: string
  children: React.ReactNode
  accent?: string
}

export default function DashboardCard({ title, children, accent = '#38bdf8' }: DashboardCardProps) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      padding: '1.25rem', borderTop: `3px solid ${accent}`
    }}>
      <h3 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '1rem' }}>{title}</h3>
      {children}
    </div>
  )
}

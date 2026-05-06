import React from 'react'

interface DashboardCardProps {
  title: string
  children: React.ReactNode
  accent?: string
  action?: React.ReactNode
}

export default function DashboardCard({ title, children, action }: DashboardCardProps) {
  return (
    <div className="gp-card gp-card--accent-top">
      <div className="gp-card__header">
        <div className="gp-card__title">{title}</div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

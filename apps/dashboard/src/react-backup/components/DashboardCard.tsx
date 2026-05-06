/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import React from 'react'

interface DashboardCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  accent?: string
  action?: React.ReactNode
}

export default function DashboardCard({ title, subtitle, children, action }: DashboardCardProps) {
  return (
    <div className="gp-card gp-card--accent-top">
      <div className="gp-card__header">
        <div>
          <div className="gp-card__title">{title}</div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--gp-text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

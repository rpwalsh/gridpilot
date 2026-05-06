/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { ReactNode } from 'react'
import NavRail from './NavRail'

interface AppShellProps {
  children: ReactNode
  title: string
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="gp-shell">
      <NavRail />
      <div className="gp-shell__content">
        <header className="gp-shell__header">
          <div style={{ flex: 1 }}>
            <h1 className="gp-page-header__title">{title}</h1>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gp-text-secondary)' }}>
            {new Date().toUTCString()}
          </div>
        </header>
        <main className="gp-shell__main">{children}</main>
      </div>
    </div>
  )
}

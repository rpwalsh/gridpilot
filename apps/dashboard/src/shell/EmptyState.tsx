/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

interface EmptyStateProps {
  title: string
  message: string
  icon?: string
}

export default function EmptyState({ title, message, icon = 'â—‹' }: EmptyStateProps) {
  return (
    <div className="gp-empty">
      <div className="gp-empty__icon">{icon}</div>
      <h2 className="gp-empty__title">{title}</h2>
      <p className="gp-empty__message">{message}</p>
    </div>
  )
}

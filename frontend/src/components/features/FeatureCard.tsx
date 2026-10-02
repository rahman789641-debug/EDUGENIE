import React from 'react'
import { Link } from 'react-router-dom'

export interface FeatureCardProps {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  path: string
  actionLabel?: string
  badge?: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  id,
  title,
  description,
  icon,
  path,
  actionLabel = 'Launch Workspace →',
  badge,
}) => {
  return (
    <Link to={path} className="feature-card" id={`feature-card-${id}`}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="feature-card-icon" aria-hidden="true">
            {icon}
          </div>
          {badge && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary-light)',
                background: 'var(--color-primary-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-highlight)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="feature-card-title">{title}</h3>
        <p className="feature-card-desc">{description}</p>
      </div>
      <span className="feature-card-action">
        {actionLabel}
      </span>
    </Link>
  )
}

import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  compact?: boolean
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? 'var(--space-6) var(--space-4)' : 'var(--space-10) var(--space-6)',
        border: '1px dashed var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.01)',
      }}
    >
      {icon && (
        <div
          style={{
            width: compact ? '40px' : '52px',
            height: compact ? '40px' : '52px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? '20px' : '26px',
            color: 'var(--text-dim)',
            marginBottom: 'var(--space-3)',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h4
        style={{
          fontSize: compact ? 'var(--text-sm)' : 'var(--text-base)',
          fontWeight: 600,
          color: 'var(--text-main)',
          margin: 0,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          maxWidth: '360px',
          marginTop: 'var(--space-1)',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  )
}

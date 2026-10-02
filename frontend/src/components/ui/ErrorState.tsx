import React from 'react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryText?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Request Failed',
  message,
  onRetry,
  retryText = 'Try Again',
}) => {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--color-danger-bg)',
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <span
          style={{
            color: 'var(--color-danger)',
            fontSize: '18px',
            flexShrink: 0,
            marginTop: '1px',
          }}
          aria-hidden="true"
        >
          ⚠️
        </span>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: '#fca5a5',
              margin: 0,
            }}
          >
            {title}
          </h4>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              marginTop: '4px',
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryText}
          </Button>
        </div>
      )}
    </div>
  )
}

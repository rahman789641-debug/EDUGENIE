import React from 'react'

export interface LoadingStateProps {
  message?: string
  subMessage?: string
  fullHeight?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Processing request...',
  subMessage,
  fullHeight = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        minHeight: fullHeight ? '300px' : '160px',
        textAlign: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--color-primary-light)',
        }}
        aria-hidden="true"
      />
      <div>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)' }}>
          {message}
        </p>
        {subMessage && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: '4px' }}>
            {subMessage}
          </p>
        )}
      </div>
    </div>
  )
}

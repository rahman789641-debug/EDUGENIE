import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'cyan' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary-subtle)',
      color: 'var(--color-primary-light)',
      border: '1px solid var(--border-highlight)',
    },
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: '1px solid var(--color-success-border)',
    },
    warning: {
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
      border: '1px solid var(--color-warning-border)',
    },
    danger: {
      background: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-border)',
    },
    cyan: {
      background: 'var(--color-accent-cyan-subtle)',
      color: 'var(--color-accent-cyan)',
      border: '1px solid rgba(6, 182, 212, 0.3)',
    },
    neutral: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-subtle)',
    },
  }

  return (
    <span
      className={`ui-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'var(--font-mono)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        borderRadius: 'var(--radius-sm)',
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

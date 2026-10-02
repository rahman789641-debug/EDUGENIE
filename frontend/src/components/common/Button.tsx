import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false)

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)' },
    md: { padding: '10px 18px', fontSize: '14px', borderRadius: 'var(--radius-md)' },
    lg: { padding: '14px 24px', fontSize: '16px', borderRadius: 'var(--radius-md)' },
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: isHovered ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'var(--gradient-brand)',
      color: '#ffffff',
      border: 'none',
      boxShadow: isHovered ? '0 0 20px rgba(99, 102, 241, 0.5)' : '0 2px 10px rgba(99, 102, 241, 0.3)',
    },
    secondary: {
      background: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
      color: 'var(--text-main)',
      border: '1px solid var(--border-subtle)',
    },
    ghost: {
      background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      color: 'var(--text-muted)',
      border: 'none',
    },
    danger: {
      background: 'var(--color-danger)',
      color: '#ffffff',
      border: 'none',
    },
  }

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
        outline: 'none',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {loading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {!loading && icon}
      {children}
    </button>
  )
}

import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  glowOnHover?: boolean
  className?: string
  style?: React.CSSProperties
  id?: string
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  badge,
  badgeColor,
  glowOnHover = true,
  style,
  id,
}) => {
  const [isHovered, setIsHovered] = React.useState(false)

  const cardStyle: React.CSSProperties = {
    background: isHovered && glowOnHover ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
    backdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--border-subtle)',
    borderColor: isHovered && glowOnHover ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: isHovered && glowOnHover ? '0 12px 36px rgba(0, 0, 0, 0.4)' : 'var(--glass-shadow)',
    transition: 'all var(--transition-normal)',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }

  return (
    <section
      id={id}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(title || badge) && (
        <div style={styles.header}>
          <div>
            {title && <h3 style={styles.title}>{title}</h3>}
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          {badge && (
            <span
              style={{
                ...styles.badge,
                color: badgeColor || 'var(--color-primary-light)',
                backgroundColor: badgeColor ? `${badgeColor}18` : 'rgba(99, 102, 241, 0.15)',
                borderColor: badgeColor ? `${badgeColor}40` : 'rgba(99, 102, 241, 0.3)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      <div>{children}</div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-main)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  badge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    borderWidth: '1px',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
}

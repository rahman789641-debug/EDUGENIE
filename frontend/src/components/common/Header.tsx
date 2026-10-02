import React from 'react'

interface HeaderProps {
  backendConnected: boolean | null
}

export const Header: React.FC<HeaderProps> = ({ backendConnected }) => {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <div style={styles.brandGroup}>
          <div style={styles.logoBadge}>
            <span style={styles.logoSpark}>✦</span>
          </div>
          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.brandTitle}>EDUGENIE</h1>
              <span style={styles.badgeVersion}>v0.1.0-alpha</span>
            </div>
            <p style={styles.brandSubtitle}>Google Gemini Powered Learning Assistant</p>
          </div>
        </div>

        <div style={styles.navGroup}>
          <div
            id="system-status-indicator"
            style={{
              ...styles.statusChip,
              borderColor:
                backendConnected === true
                  ? 'rgba(16, 185, 129, 0.4)'
                  : backendConnected === false
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(245, 158, 11, 0.4)',
              background:
                backendConnected === true
                  ? 'rgba(16, 185, 129, 0.1)'
                  : backendConnected === false
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(245, 158, 11, 0.1)',
            }}
          >
            <span
              style={{
                ...styles.statusDot,
                backgroundColor:
                  backendConnected === true
                    ? 'var(--color-success)'
                    : backendConnected === false
                    ? 'var(--color-danger)'
                    : 'var(--color-warning)',
              }}
            />
            <span style={styles.statusText}>
              {backendConnected === true
                ? 'Backend Operational'
                : backendConnected === false
                ? 'Backend Disconnected'
                : 'Probing Backend...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    borderBottom: '1px solid var(--border-subtle)',
    backdropFilter: 'var(--glass-blur)',
    background: 'rgba(8, 12, 20, 0.75)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoBadge: {
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--gradient-brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
  },
  logoSpark: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1.1,
  },
  badgeVersion: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--text-accent)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  navGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statusChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: 'var(--radius-full)',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all var(--transition-normal)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    color: 'var(--text-main)',
  },
}

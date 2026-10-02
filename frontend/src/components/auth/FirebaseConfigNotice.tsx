import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export const FirebaseConfigNotice: React.FC = () => {
  const { isConfigured, configError } = useAuth()

  if (isConfigured) return null

  return (
    <div
      id="firebase-config-notice"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        margin: '0 0 var(--space-4) 0',
        color: 'var(--text-main)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: '0 0 var(--space-1) 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: '#F87171',
            }}
          >
            Firebase Setup Required
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            {configError || 'Firebase credentials are missing.'}
          </p>
          <div
            style={{
              marginTop: 'var(--space-2)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-dim)',
              lineHeight: 1.6,
            }}
          >
            Add to <code>.env</code> in frontend or root:
            <br />
            <code>VITE_FIREBASE_API_KEY=...</code>
            <br />
            <code>VITE_FIREBASE_AUTH_DOMAIN=...</code>
            <br />
            <code>VITE_FIREBASE_PROJECT_ID=...</code>
            <br />
            <code>VITE_FIREBASE_APP_ID=...</code>
          </div>
        </div>
      </div>
    </div>
  )
}

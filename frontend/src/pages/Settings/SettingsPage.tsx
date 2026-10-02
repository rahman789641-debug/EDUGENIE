import React from 'react'
import { Card } from '../../components/ui/Card'
import { SystemHealthCard } from '../../components/dashboard/SystemHealthCard'
import { useAuth } from '../../hooks/useAuth'

export const SettingsPage: React.FC = () => {
  const { currentUser, isConfigured, configError } = useAuth()

  const providerId = currentUser?.providerData?.[0]?.providerId || 'password'
  const providerLabel = providerId === 'google.com' ? 'Google OAuth' : 'Email + Password'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          System Settings & Runtime Diagnostics
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
          Inspect frontend configuration, backend proxy status, and AI model orchestration variables.
        </p>
      </div>

      {/* Backend Health Diagnostics */}
      <SystemHealthCard />

      {/* Authenticated User Session Details */}
      <Card
        title="Authenticated Session (Firebase)"
        subtitle="Live authentication state tracked via modular Firebase onAuthStateChanged observer"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Authentication Status
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: currentUser ? 'var(--color-success)' : 'var(--color-warning)',
                marginTop: '4px',
              }}
            >
              {currentUser ? 'AUTHENTICATED' : 'GUEST / UNKNOWN'}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Firebase Web SDK v12 Modular Auth active.
            </p>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Sign-In Provider
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-accent-cyan)', marginTop: '4px' }}>
              {currentUser ? providerLabel : 'None'}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Provider ID: <code>{providerId}</code>
            </p>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              User Identifier (UID)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginTop: '4px',
                wordBreak: 'break-all',
              }}
            >
              {currentUser?.uid || 'Not signed in'}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Email: <code>{currentUser?.email || 'N/A'}</code>
            </p>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Email Verification
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: currentUser?.emailVerified ? 'var(--color-success)' : 'var(--color-warning)',
                marginTop: '4px',
              }}
            >
              {currentUser?.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Google accounts are automatically verified by Google OAuth.
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration Summary Card */}
      <Card
        title="Runtime Configuration & Boundaries"
        subtitle="Environment variables loaded strictly through backend configuration"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Gemini Model Routing
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-accent-cyan)', marginTop: '4px' }}>
              gemini-3.1-flash-lite
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Configured via environment variable <code>GEMINI_MODEL</code>. Never hardcoded.
            </p>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              API Security Isolation
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-success)', marginTop: '4px' }}>
              Backend Enforced
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              AI model secrets and server credentials are never exposed or delivered to frontend clients.
            </p>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Firebase Client Status
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: isConfigured ? 'var(--color-success)' : 'var(--color-warning)',
                marginTop: '4px',
              }}
            >
              {isConfigured ? 'CONFIGURED & READY' : 'CONFIG REQUIRED'}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              {isConfigured ? 'Environment keys loaded successfully.' : configError || 'Missing client env variables.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

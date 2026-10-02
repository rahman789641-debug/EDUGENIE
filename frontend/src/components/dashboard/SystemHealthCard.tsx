import React, { useEffect, useState } from 'react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { fetchHealth } from '../../api/health'
import type { HealthResponse } from '../../types/api'

interface SystemHealthCardProps {
  onStatusChange?: (connected: boolean | null) => void
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ onStatusChange }) => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const performCheck = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, latencyMs } = await fetchHealth()
      setHealthData(data)
      setLatency(latencyMs)
      setLastChecked(new Date())
      onStatusChange?.(data.status === 'ok')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach API endpoint'
      setError(msg)
      setHealthData(null)
      setLatency(null)
      setLastChecked(new Date())
      onStatusChange?.(false)
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    let active = true
    fetchHealth()
      .then(({ data, latencyMs }) => {
        if (active) {
          setHealthData(data)
          setLatency(latencyMs)
          setLastChecked(new Date())
          setLoading(false)
          onStatusChange?.(data.status === 'ok')
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to reach API endpoint'
          setError(msg)
          setHealthData(null)
          setLatency(null)
          setLastChecked(new Date())
          setLoading(false)
          onStatusChange?.(false)
        }
      })

    return () => {
      active = false
    }
  }, [onStatusChange])

  return (
    <Card
      id="system-health-card"
      title="Backend Health & API Gateway"
      subtitle="Real-time verification of frontend-to-backend proxy communication"
      badge={
        loading
          ? 'PINGING'
          : healthData?.status === 'ok'
          ? 'OPERATIONAL'
          : 'DISCONNECTED'
      }
      badgeColor={
        loading
          ? 'var(--color-warning)'
          : healthData?.status === 'ok'
          ? 'var(--color-success)'
          : 'var(--color-danger)'
      }
    >
      <div style={styles.grid}>
        <div style={styles.metricBox}>
          <span style={styles.metricLabel}>Target Route</span>
          <span style={styles.metricValue}>GET /api/health</span>
          <span style={styles.metricSub}>Proxied via Vite Dev Server</span>
        </div>

        <div style={styles.metricBox}>
          <span style={styles.metricLabel}>Service Name</span>
          <span style={styles.metricValue}>
            {healthData?.service || (loading ? '...' : 'Unavailable')}
          </span>
          <span style={styles.metricSub}>Contract Identifier</span>
        </div>

        <div style={styles.metricBox}>
          <span style={styles.metricLabel}>Roundtrip Latency</span>
          <span style={styles.metricValue}>
            {latency !== null ? `${latency} ms` : loading ? '...' : '--'}
          </span>
          <span style={styles.metricSub}>Client-to-Service Time</span>
        </div>

        <div style={styles.metricBox}>
          <span style={styles.metricLabel}>Operational Status</span>
          <span
            style={{
              ...styles.metricValue,
              color:
                healthData?.status === 'ok'
                  ? 'var(--color-success)'
                  : 'var(--color-danger)',
            }}
          >
            {healthData?.status ? healthData.status.toUpperCase() : loading ? 'CHECKING' : 'OFFLINE'}
          </span>
          <span style={styles.metricSub}>
            {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : 'Initializing'}
          </span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>⚠️</span>
          <div>
            <strong>Backend Connection Error:</strong>
            <p style={{ marginTop: '2px', fontSize: '13px' }}>{error}</p>
            <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-dim)' }}>
              Make sure the FastAPI backend is running on <code>http://127.0.0.1:8000</code>.
            </p>
          </div>
        </div>
      )}

      {healthData && (
        <div style={styles.responseContainer}>
          <div style={styles.responseHeader}>
            <span style={styles.responseTitle}>FastAPI Validated Response Body</span>
            <span style={styles.responseTag}>HTTP 200 OK</span>
          </div>
          <pre style={styles.codeBlock}>
            <code>{JSON.stringify(healthData, null, 2)}</code>
          </pre>
        </div>
      )}

      <div style={styles.actionRow}>
        <Button
          id="btn-recheck-health"
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={performCheck}
        >
          🔄 Re-test Endpoint
        </Button>
        <span style={styles.hint}>
          Production ready • CORS configured • Environment driven
        </span>
      </div>
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  metricBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-dim)',
    fontWeight: 600,
  },
  metricValue: {
    fontSize: '16px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  metricSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  errorBox: {
    background: 'var(--color-danger-bg)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    color: '#fca5a5',
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '20px',
  },
  responseContainer: {
    background: '#070b12',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  responseTitle: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  responseTag: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-success)',
    background: 'var(--color-success-bg)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  codeBlock: {
    margin: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    color: 'var(--color-cyan)',
    lineHeight: 1.4,
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-dim)',
  },
}

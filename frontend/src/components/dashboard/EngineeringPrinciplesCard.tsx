import React from 'react'
import { Card } from '../common/Card'

const PRINCIPLES = [
  {
    step: '01',
    title: 'Plan',
    description: 'System contracts, educational requirements, and schema design before code.',
    accent: '#6366f1',
  },
  {
    step: '02',
    title: 'Design',
    description: 'Monorepo architecture separating frontend, backend, schemas, and AI orchestration.',
    accent: '#8b5cf6',
  },
  {
    step: '03',
    title: 'Structure',
    description: 'Modular services, Pydantic type safety, and centralized configuration.',
    accent: '#06b6d4',
  },
  {
    step: '04',
    title: 'Test',
    description: 'Automated test suite for health endpoints, configs, and request validation.',
    accent: '#10b981',
  },
  {
    step: '05',
    title: 'Secure',
    description: 'Zero hardcoded secrets, proxy isolation, and environment-driven CORS.',
    accent: '#f59e0b',
  },
  {
    step: '06',
    title: 'Deploy & Scale',
    description: 'Stateless FastAPI ASGI backend, Vite production bundling, container ready.',
    accent: '#ec4899',
  },
]

export const EngineeringPrinciplesCard: React.FC = () => {
  return (
    <Card
      id="engineering-principles-card"
      title="Engineering Foundation & Methodology"
      subtitle="Built with professional software engineering rigor rather than vibe-coding shortcuts"
      badge="STANDARDS"
      badgeColor="var(--color-cyan)"
    >
      <div style={styles.grid}>
        {PRINCIPLES.map((p) => (
          <div key={p.step} style={styles.stepCard}>
            <div style={styles.stepTop}>
              <span style={{ ...styles.stepBadge, borderColor: p.accent, color: p.accent }}>
                {p.step}
              </span>
              <h4 style={styles.stepTitle}>{p.title}</h4>
            </div>
            <p style={styles.stepDesc}>{p.description}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  stepCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stepTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  stepBadge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  stepTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  stepDesc: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
}

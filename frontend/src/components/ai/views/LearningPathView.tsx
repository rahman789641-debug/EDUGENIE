import React from 'react'
import type { LearningPathResponsePayload } from '../../../api/ai'

interface LearningPathViewProps {
  data: LearningPathResponsePayload
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({ data }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-primary-light)',
              background: 'var(--color-primary-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
            }}
          >
            Level: {data.level}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              background: 'var(--color-bg-card)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {data.total_stages} Progression Stages
          </span>
        </div>

        {data.target_goal && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <strong>Goal:</strong> {data.target_goal}
          </div>
        )}
      </div>

      {/* Milestone Stages Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'relative' }}>
        {data.milestones.map((stage, idx) => {
          const isLast = idx === data.milestones.length - 1

          return (
            <div key={stage.stage_number} style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative' }}>
              {/* Timeline indicator column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '32px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-cyan)',
                  }}
                >
                  {stage.stage_number}
                </div>

                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      background: 'var(--border-subtle)',
                      margin: 'var(--space-2) 0',
                    }}
                  />
                )}
              </div>

              {/* Stage Card */}
              <div
                id={`milestone-stage-${stage.stage_number}`}
                style={{
                  flex: 1,
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  marginBottom: isLast ? 0 : 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--text-main)', fontWeight: 600 }}>
                    {stage.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-accent-cyan)',
                      background: 'var(--color-accent-cyan-subtle)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Stage {stage.stage_number}
                  </span>
                </div>

                {/* Focus Concepts */}
                {stage.focus_concepts && stage.focus_concepts.length > 0 && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginBottom: 'var(--space-1)' }}>
                      Focus Concepts:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {stage.focus_concepts.map((concept, cIdx) => (
                        <span
                          key={cIdx}
                          style={{
                            fontSize: '11px',
                            background: 'var(--color-bg-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Activities */}
                {stage.recommended_activities && stage.recommended_activities.length > 0 && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: 'var(--space-1)' }}>
                      Recommended Activities:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', lineHeight: 1.6 }}>
                      {stage.recommended_activities.map((act, aIdx) => (
                        <li key={aIdx}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Checkpoint Project */}
                {stage.checkpoint_project && (
                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      🎯 Checkpoint Mastery Project:{' '}
                    </span>
                    <span style={{ color: 'var(--text-main)' }}>{stage.checkpoint_project}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

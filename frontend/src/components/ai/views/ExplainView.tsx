import React from 'react'
import type { ExplainResponsePayload } from '../../../api/ai'

interface ExplainViewProps {
  data: ExplainResponsePayload
}

export const ExplainView: React.FC<ExplainViewProps> = ({ data }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Badges bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-accent-amber)',
            background: 'var(--color-accent-amber-subtle)',
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
            color: 'var(--color-accent-cyan)',
            background: 'var(--color-accent-cyan-subtle)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Depth: {data.depth}
        </span>
        {data.model && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              marginLeft: 'auto',
            }}
          >
            {data.model}
          </span>
        )}
      </div>

      {/* Main explanation body */}
      <div
        id="explain-body-text"
        style={{
          color: 'var(--text-main)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
        }}
      >
        {data.explanation}
      </div>

      {/* Intuitive Analogies */}
      {data.analogies && data.analogies.length > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '3px solid var(--color-accent-amber)',
            padding: 'var(--space-4)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-accent-amber)',
              marginBottom: 'var(--space-2)',
            }}
          >
            💡 Intuitive Analogies
          </div>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
            {data.analogies.map((analogy, i) => (
              <li key={i} style={{ marginBottom: 'var(--space-1)' }}>
                {analogy}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Takeaways */}
      {data.key_takeaways && data.key_takeaways.length > 0 && (
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.08)',
            borderLeft: '3px solid var(--color-accent-cyan)',
            padding: 'var(--space-4)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-accent-cyan)',
              marginBottom: 'var(--space-2)',
            }}
          >
            📌 Key Revision Takeaways
          </div>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
            {data.key_takeaways.map((item, i) => (
              <li key={i} style={{ marginBottom: 'var(--space-1)' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

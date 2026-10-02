import React from 'react'
import type { SummarizeResponsePayload } from '../../../api/ai'

interface SummaryViewProps {
  data: SummarizeResponsePayload
}

export const SummaryView: React.FC<SummaryViewProps> = ({ data }) => {
  const reductionPercent = Math.max(
    0,
    Math.round(
      ((data.original_length_chars - data.summary_length_chars) / Math.max(1, data.original_length_chars)) * 100
    )
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Metrics Header */}
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
              color: 'var(--color-accent-cyan)',
              background: 'var(--color-accent-cyan-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Format: {data.format}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-success)',
              background: 'var(--color-success-bg)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {reductionPercent}% Content Reduction
          </span>
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {data.original_length_chars} chars → {data.summary_length_chars} chars
        </div>
      </div>

      {/* Main Revision Summary */}
      <div
        id="summary-text-content"
        style={{
          color: 'var(--text-main)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
        }}
      >
        {data.summary}
      </div>

      {/* Key Extracted Points */}
      {data.key_points && data.key_points.length > 0 && (
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-primary-light)',
              marginBottom: 'var(--space-3)',
            }}
          >
            📋 High-Yield Key Points
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 'var(--space-4)',
              color: 'var(--text-main)',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
            }}
          >
            {data.key_points.map((point, i) => (
              <li key={i} style={{ marginBottom: 'var(--space-2)' }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

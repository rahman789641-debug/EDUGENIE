import React, { useState } from 'react'
import type { QAResponsePayload } from '../../../api/ai'
import { Button } from '../../ui/Button'

interface QAViewProps {
  data: QAResponsePayload
}

export const QAView: React.FC<QAViewProps> = ({ data }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Meta Bar */}
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
          {data.model && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary-light)',
                background: 'var(--color-primary-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Model: {data.model}
            </span>
          )}
          {data.grounded && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-accent-emerald)',
                background: 'var(--color-accent-emerald-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              🌐 Web Grounded
            </span>
          )}
        </div>

        <Button
          id="btn-copy-qa-answer"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          icon={<span>{copied ? '✓' : '📋'}</span>}
        >
          {copied ? 'Copied to Clipboard' : 'Copy Answer'}
        </Button>
      </div>

      {/* Answer Content */}
      <div
        id="qa-answer-text"
        style={{
          color: 'var(--text-main)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
        }}
      >
        {data.answer}
      </div>

      {/* Sources */}
      {data.sources && data.sources.length > 0 && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-dim)',
          }}
        >
          <strong>Sources:</strong> {data.sources.join(', ')}
        </div>
      )}
    </div>
  )
}

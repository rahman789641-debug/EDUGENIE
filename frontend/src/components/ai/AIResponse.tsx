import React from 'react'
import { Card } from '../ui/Card'
import { LoadingState } from '../ui/LoadingState'
import { ErrorState } from '../ui/ErrorState'
import { EmptyState } from '../ui/EmptyState'

export type AIResponseStatus = 'empty' | 'loading' | 'success' | 'error'

export interface AIResponseProps {
  status?: AIResponseStatus
  content?: string | null
  children?: React.ReactNode
  error?: string | null
  loadingMessage?: string
  onRetry?: () => void
  taskTitle?: string
}

export const AIResponse: React.FC<AIResponseProps> = ({
  status = 'empty',
  content = null,
  children = null,
  error = null,
  loadingMessage = 'Generating response via Gemini model...',
  onRetry,
  taskTitle = 'AI Learning Assistant',
}) => {
  return (
    <Card
      title={`${taskTitle} Output`}
      subtitle="Validated structured response from Google Gemini AI backend"
      action={
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background:
              status === 'success'
                ? 'var(--color-success-bg)'
                : status === 'loading'
                ? 'var(--color-warning-bg)'
                : status === 'error'
                ? 'var(--color-danger-bg)'
                : 'rgba(255, 255, 255, 0.05)',
            color:
              status === 'success'
                ? 'var(--color-success)'
                : status === 'loading'
                ? 'var(--color-warning)'
                : status === 'error'
                ? 'var(--color-danger)'
                : 'var(--text-dim)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {status.toUpperCase()}
        </span>
      }
    >
      {status === 'empty' && (
        <EmptyState
          icon={
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          }
          title="Your AI response will appear here."
          description="Select an educational task above, input your query or educational text, and click Generate."
        />
      )}

      {status === 'loading' && (
        <LoadingState
          message={loadingMessage}
          subMessage="Orchestrating request through Google Gemini pipeline..."
        />
      )}

      {status === 'error' && (
        <ErrorState
          title="AI Processing Error"
          message={error || 'Unable to generate response. Please verify network connectivity.'}
          onRetry={onRetry}
        />
      )}

      {status === 'success' && (
        <div>
          {children ? (
            children
          ) : content ? (
            <div
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
                color: 'var(--text-main)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {content}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

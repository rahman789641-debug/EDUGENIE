import React, { useState, useRef } from 'react'
import { explanationApi } from '../../api/explanation'
import type {
  ExplanationLevel,
  ExplanationResponse,
} from '../../types/explanation'
import { SafeMarkdownRenderer } from '../chat/SafeMarkdownRenderer'

const EXAMPLE_TOPICS = [
  'Recursion',
  'Photosynthesis',
  'REST API',
  'Binary Search',
  'Machine Learning',
]

const LEVEL_OPTIONS: Array<{
  id: ExplanationLevel
  label: string
  desc: string
}> = [
  {
    id: 'beginner',
    label: 'Beginner',
    desc: 'Plain language, first principles & intuitive analogies',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    desc: 'Mechanisms, patterns & common pitfalls',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    desc: 'Deep architecture, trade-offs & edge cases',
  },
]

export const ConceptExplainer: React.FC = () => {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<ExplanationLevel>('beginner')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExplanationResponse | null>(null)
  const [copiedExample, setCopiedExample] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelectExample = (example: string) => {
    setTopic(example)
    setError(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleCopyExample = async () => {
    if (!result?.example) return
    try {
      await navigator.clipboard.writeText(result.example)
      setCopiedExample(true)
      setTimeout(() => setCopiedExample(false), 2000)
    } catch {
      // Fallback or ignore
    }
  }

  const handleExplain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanTopic = topic.trim()
    if (!cleanTopic) {
      setError('Please enter a topic before requesting an explanation.')
      return
    }

    if (cleanTopic.length < 2) {
      setError('Topic must be at least 2 characters.')
      return
    }

    if (cleanTopic.length > 500) {
      setError('Topic must not exceed 500 characters.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await explanationApi.explainConcept(cleanTopic, level)
      setResult(response)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to generate explanation right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleExplain()
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="explainer-container" data-testid="concept-explainer">
      {/* Control Card: Topic Input & Level Selector */}
      <form className="explainer-control-card" onSubmit={handleExplain}>
        <div className="explainer-input-group">
          <label htmlFor="topic-input" className="explainer-label">
            <span>Concept or Topic</span>
            <span className="explainer-char-count">{topic.length}/500</span>
          </label>
          <div className="explainer-input-wrapper">
            <input
              id="topic-input"
              ref={inputRef}
              type="text"
              className="explainer-topic-input"
              placeholder="Enter a topic to explain (e.g., Recursion, Photosynthesis, REST API)..."
              value={topic}
              maxLength={500}
              disabled={isLoading}
              onChange={(e) => {
                setTopic(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              data-testid="explainer-topic-input"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Level Selector */}
        <div className="explainer-level-section">
          <span className="explainer-label">Learner Level</span>
          <div
            className="explainer-level-selector"
            role="radiogroup"
            aria-label="Learner level"
          >
            {LEVEL_OPTIONS.map((opt) => {
              const isSelected = level === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isLoading}
                  className={`explainer-level-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setLevel(opt.id)}
                  data-testid={`level-btn-${opt.id}`}
                >
                  <span className="explainer-level-title">
                    {opt.label}
                    {isSelected && <span aria-hidden="true">✓</span>}
                  </span>
                  <span className="explainer-level-desc">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="explainer-actions-bar">
          {result && (
            <button
              type="button"
              className="chat-code-copy-btn"
              onClick={handleReset}
              disabled={isLoading}
              style={{ marginRight: 'auto' }}
            >
              Clear Result
            </button>
          )}

          <button
            type="submit"
            className="explainer-submit-btn"
            disabled={!topic.trim() || isLoading}
            data-testid="explain-submit-btn"
          >
            {isLoading ? (
              <>
                <span className="chat-loading-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                <span>Explaining...</span>
              </>
            ) : (
              <>
                <span>Explain Concept</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error State Banner */}
      {error && (
        <div className="chat-error-banner" data-testid="explainer-error-banner">
          <div className="chat-error-content">
            <span className="chat-error-icon" aria-hidden="true">⚠️</span>
            <span className="chat-error-message">{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleExplain()}
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="explainer-loading-card" data-testid="explainer-loading-state">
          <div className="chat-loading-wrapper">
            <div className="chat-loading-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <span className="explainer-loading-text">
              EduGenie is explaining...
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            Synthesizing pedagogical breakdown tailored for {level} level
          </span>
        </div>
      )}

      {/* Result Area */}
      {!isLoading && result && (
        <article className="explainer-result-card" data-testid="explainer-result-card">
          {/* Header */}
          <header className="explainer-result-header">
            <div className="explainer-result-title-group">
              <div className="explainer-result-badges">
                <span className={`explainer-level-badge ${result.level}`}>
                  {result.level} level
                </span>
                {result.model && (
                  <span className="chat-model-tag">{result.model}</span>
                )}
                {result.request_id && (
                  <span className="chat-timestamp">ID: {result.request_id}</span>
                )}
              </div>
              <h3 className="explainer-result-title" data-testid="explainer-title">
                {result.title}
              </h3>
            </div>
          </header>

          {/* Explanation Section */}
          <section className="explainer-section">
            <div className="explainer-section-header">
              <h4 className="explainer-section-title">
                <span aria-hidden="true">📖</span> Explanation
              </h4>
            </div>
            <div className="explainer-body-text" data-testid="explainer-body">
              <SafeMarkdownRenderer content={result.explanation} />
            </div>
          </section>

          {/* Key Points Section */}
          {result.key_points && result.key_points.length > 0 && (
            <section className="explainer-section">
              <div className="explainer-section-header">
                <h4 className="explainer-section-title">
                  <span aria-hidden="true">💡</span> Core Key Points
                </h4>
              </div>
              <ul className="explainer-key-points-list" data-testid="explainer-key-points">
                {result.key_points.map((point, idx) => (
                  <li key={idx} className="explainer-key-point-item">
                    <span className="explainer-point-icon" aria-hidden="true">✔</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Example Section */}
          {result.example && (
            <section className="explainer-section">
              <div className="explainer-section-header">
                <h4 className="explainer-section-title">
                  <span aria-hidden="true">💻</span> Illustrative Example
                </h4>
                <button
                  type="button"
                  className="explainer-copy-btn"
                  onClick={handleCopyExample}
                  aria-label="Copy example code"
                >
                  {copiedExample ? 'Copied!' : 'Copy Example'}
                </button>
              </div>
              <div className="explainer-example-wrapper" data-testid="explainer-example-box">
                <div className="explainer-example-header">
                  <span className="explainer-example-lang">code / walkthrough</span>
                </div>
                <pre className="explainer-example-content">
                  <code>{result.example}</code>
                </pre>
              </div>
            </section>
          )}
        </article>
      )}

      {/* Empty State: shown when no result and not loading */}
      {!isLoading && !result && (
        <div className="explainer-empty-card" data-testid="explainer-empty-state">
          <span className="explainer-empty-icon" aria-hidden="true">💡</span>
          <h3 className="explainer-empty-title">Understand any concept</h3>
          <p className="explainer-empty-subtitle">
            Enter a topic and EduGenie will explain it at your level.
          </p>
          <div className="explainer-suggestions-wrap">
            <span className="explainer-suggestions-label">Try an example topic:</span>
            <div className="explainer-suggestions-pills">
              {EXAMPLE_TOPICS.map((topicItem) => (
                <button
                  key={topicItem}
                  type="button"
                  className="explainer-suggestion-pill"
                  onClick={() => handleSelectExample(topicItem)}
                  data-testid={`suggestion-pill-${topicItem.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {topicItem}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

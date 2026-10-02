import React, { useState, useRef } from 'react'
import { researchApi } from '../../api/research'
import { BorderBeam } from '../ui/border-beam'
import { ShinyButton } from '../ui/shiny-button'
import { SafeMarkdownRenderer } from '../chat/SafeMarkdownRenderer'
import type {
  ResearchHistoryItem,
  ResearchResponse,
  WebSource,
} from '../../types/research'

const EXAMPLE_QUERIES = [
  'What are the latest official developments in Python?',
  'What is FastAPI and how is it used?',
  'Explain React Server Components in simple terms',
  'How does web search grounding prevent AI hallucinations?',
]

const STORAGE_KEY = 'edugenie_research_history'

export const WebResearchAssistant: React.FC = () => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResearchResponse | null>(null)
  const [history, setHistory] = useState<ResearchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ResearchHistoryItem[]
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5)
        }
      }
    } catch {
      // Storage unavailable
    }
    return []
  })
  const [copied, setCopied] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)


  const saveToHistory = (item: ResearchHistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.query.toLowerCase() !== item.query.toLowerCase())
      const updated = [item, ...filtered].slice(0, 5)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // Storage failover
      }
      return updated
    })
  }

  const handleClearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  const handleSelectExample = (example: string) => {
    setQuery(example)
    setError(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSelectHistory = (item: ResearchHistoryItem) => {
    setQuery(item.query)
    setResult(item.response)
    setError(null)
  }

  const handleResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanQuery = query.trim()
    if (!cleanQuery) {
      setError('Please enter a research question or topic.')
      return
    }

    if (cleanQuery.length < 2) {
      setError('Research query must be at least 2 characters.')
      return
    }

    if (cleanQuery.length > 1000) {
      setError('Research query must not exceed 1,000 characters.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await researchApi.conductResearch(cleanQuery)
      setResult(response)
      saveToHistory({
        id: response.request_id || `hist-${Date.now()}`,
        query: cleanQuery,
        timestamp: Date.now(),
        response,
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to complete research. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyAnswer = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  return (
    <div className="research-container" data-testid="web-research-assistant">
      {/* Search Input Card */}
      <div className="research-search-card">
        <form className="research-form" onSubmit={handleResearch}>
          <div className="research-input-row">
            <BorderBeam
              size="md"
              borderRadius={24}
              colorVariant="colorful"
              className="research-border-beam-wrapper"
            >
              <div className="research-input-wrapper">
                <span className="research-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="research-input"
                  placeholder="Ask an educational question requiring web research..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={isLoading}
                  aria-label="Research query"
                  data-testid="research-query-input"
                />
              </div>
            </BorderBeam>
            <ShinyButton
              type="submit"
              className="btn btn-primary research-submit-btn"
              disabled={isLoading || !query.trim()}
              data-testid="research-submit-button"
              size="pill"
              cornerRadius={20}
              fillColor="#0f172a"
              accentColor="#ff5f00"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Researching sources...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>Research</span>
                </>
              )}
            </ShinyButton>
          </div>
        </form>

        {/* Suggestion Pills */}
        <div className="research-examples">
          <span className="research-examples-label">Try Asking:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              className="research-example-pill"
              onClick={() => handleSelectExample(example)}
              disabled={isLoading}
              data-testid={`example-pill-${example.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
            >
              {example}
            </button>
          ))}
        </div>

        {/* History Pills */}
        {history.length > 0 && (
          <div className="research-history-bar" data-testid="research-history-bar">
            <span className="research-history-label">Recent:</span>
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                className="research-history-item"
                onClick={() => handleSelectHistory(h)}
                title={h.query}
                disabled={isLoading}
                data-testid="research-history-pill"
              >
                {h.query}
              </button>
            ))}
            <button
              type="button"
              className="btn-text"
              onClick={handleClearHistory}
              style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}
              title="Clear recent searches"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="research-error-banner" role="alert" data-testid="research-error-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => handleResearch()}
            data-testid="research-retry-button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="research-loading-card" data-testid="research-loading-card">
          <div className="research-loading-spinner" />
          <h3 className="research-loading-title">Researching sources...</h3>
          <p className="research-loading-desc">
            Retrieving live external web information, verifying citations, and grounding educational synthesis with Google Gemini.
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && !isLoading && (
        <div className="research-result-card" data-testid="research-result-card">
          {/* Header */}
          <div className="research-result-header">
            <div className="research-result-meta">
              <div className="research-result-badge-row">
                <span className="research-badge-grounded">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified Web Grounded
                </span>
                {result.model && (
                  <span className="research-model-badge">
                    {result.model}
                  </span>
                )}
              </div>
              <h2 className="research-result-query">{result.query}</h2>
            </div>

            <div className="research-result-actions">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleCopyAnswer}
                data-testid="research-copy-button"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ color: '#34d399' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Answer Section */}
          <div className="research-answer-section">
            <span className="research-answer-label">Synthesized Educational Answer</span>
            <div className="research-answer-body" data-testid="research-answer-body">
              <SafeMarkdownRenderer content={result.answer} />
            </div>
          </div>

          {/* Sources Section */}
          <div className="research-sources-section">
            <div className="research-sources-heading">
              <h3 className="research-sources-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Verified External Sources
              </h3>
              <span className="research-sources-count" data-testid="research-sources-count">
                {result.sources.length} {result.sources.length === 1 ? 'source' : 'sources'}
              </span>
            </div>

            {result.sources.length > 0 ? (
              <div className="research-sources-list" data-testid="research-sources-list">
                {result.sources.map((src: WebSource, idx: number) => (
                  <div key={`${src.url}-${idx}`} className="research-source-card" data-testid="research-source-card">
                    <div className="research-source-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="research-source-index">[{idx + 1}]</span>
                        <span className="research-source-domain">{src.domain}</span>
                      </div>
                    </div>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="research-source-link"
                      data-testid={`source-link-${idx}`}
                    >
                      <span>{src.title}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                    {src.snippet && (
                      <p className="research-source-snippet">
                        &ldquo;{src.snippet}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="research-no-sources-banner" data-testid="research-no-sources-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>No verified external sources were retrieved for this query. The synthesis reflects general educational principles.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

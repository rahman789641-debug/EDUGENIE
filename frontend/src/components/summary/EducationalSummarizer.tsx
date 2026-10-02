import React, { useState, useRef } from 'react'
import { summaryApi } from '../../api/summary'
import type {
  SummaryLength,
  SummaryResponse,
} from '../../types/summary'
import { SafeMarkdownRenderer } from '../chat/SafeMarkdownRenderer'

const SAMPLE_PASSAGES = [
  {
    title: 'Photosynthesis',
    content:
      'Photosynthesis is the fundamental biological process through which green plants, algae, and certain cyanobacteria convert sunlight into chemical energy stored in carbohydrates like glucose. This vital reaction takes place inside specialized cellular organelles called chloroplasts, which are rich in chlorophyll pigments that absorb blue and red light while reflecting green. During the light-dependent reactions within thylakoid membranes, absorbed photons drive the photolysis of water molecules, yielding protons, electrons, and releasing molecular oxygen into the atmosphere. The resulting energy carriers, ATP and NADPH, are then transferred to the fluid stroma where the light-independent Calvin cycle fixes atmospheric carbon dioxide into glyceraldehyde 3-phosphate, sustaining almost all terrestrial food webs.',
  },
  {
    title: 'Operating Systems',
    content:
      'An operating system (OS) is essential system software that manages computer hardware and software resources, providing common services for application programs. Core functions include processor management through CPU scheduling algorithms such as Round Robin, Shortest Job First, and Priority Scheduling. The OS coordinates memory allocation through virtual memory architectures, paging, and segmentation, preventing processes from interfering with each other’s address spaces. It also manages file systems, organizing hierarchical directories and tracking storage blocks on non-volatile media. Furthermore, modern operating systems maintain security boundaries via access control lists, kernel-mode versus user-mode privilege rings, and device driver abstraction layers.',
  },
  {
    title: 'Database Management',
    content:
      'Database Management Systems (DBMS) are systematic software packages designed to create, maintain, query, and administer structured collections of data. Relational databases (RDBMS) organize data into tabular schemas composed of rows and columns, enforcing ACID properties (Atomicity, Consistency, Isolation, and Durability) to ensure transactional reliability even during system failures. Relational engines rely on Structured Query Language (SQL) for declarative data manipulation and indexing mechanisms like B-trees to optimize lookup velocity. In contrast, NoSQL databases prioritize horizontal scalability, partition tolerance, and unstructured or semi-structured data formats, utilizing document stores, key-value caches, and wide-column models under the CAP theorem framework.',
  },
  {
    title: 'Machine Learning',
    content:
      'Machine learning is a subdiscipline of artificial intelligence focused on building algorithms that infer patterns directly from empirical data without being explicitly programmed with rigid deterministic rules. Supervised learning models, such as support vector machines and gradient boosted decision trees, train on labelled feature sets to perform classification or regression tasks. Unsupervised techniques, including k-means clustering and principal component analysis, uncover latent structures and dimensionality reductions in unlabeled observations. Deep learning leverages multi-layered artificial neural networks with backpropagation to extract hierarchical representations, revolutionizing modern computer vision, natural language understanding, and automated reasoning.',
  },
]

const LENGTH_OPTIONS: Array<{
  id: SummaryLength
  label: string
  badge: string
  desc: string
}> = [
  {
    id: 'short',
    label: 'Short',
    badge: 'Quick Revision',
    desc: 'Concise core essentials & bulleted takeaways for rapid review',
  },
  {
    id: 'medium',
    label: 'Medium',
    badge: 'Balanced',
    desc: 'Core ideas, key context & foundational mechanisms with clear flow',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    badge: 'Comprehensive',
    desc: 'Thorough synthesis with nuances, distinctions & structured insights',
  },
]

export const EducationalSummarizer: React.FC = () => {
  const [content, setContent] = useState('')
  const [length, setLength] = useState<SummaryLength>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SummaryResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSelectSample = (sampleContent: string) => {
    setContent(sampleContent)
    setError(null)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleSummarize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanContent = content.trim()
    if (!cleanContent) {
      setError('Please enter study material or a passage to summarize.')
      return
    }

    if (cleanContent.length < 10) {
      setError('Content must be at least 10 characters long to summarize.')
      return
    }

    if (cleanContent.length > 50000) {
      setError('Content must not exceed 50,000 characters.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await summaryApi.summarizeContent(cleanContent, length)
      setResult(response)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to generate summary right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySummary = async () => {
    if (!result?.summary) return
    const textToCopy = `${result.summary}\n\nKey Points:\n${result.key_points.map((p) => `• ${p}`).join('\n')}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    setContent('')
    setResult(null)
    setError(null)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="summarizer-container" data-testid="educational-summarizer">
      {/* Control Card */}
      <form className="summarizer-control-card" onSubmit={handleSummarize}>
        <div className="summarizer-input-group">
          <label htmlFor="summary-content-input" className="summarizer-label">
            <span>Study Material or Passage</span>
            <span className="summarizer-char-count">{content.length} / 50,000</span>
          </label>
          <textarea
            id="summary-content-input"
            ref={textareaRef}
            className="summarizer-textarea"
            placeholder="Paste educational text, lecture transcript, research notes, or textbook chapter to summarize..."
            value={content}
            maxLength={50000}
            disabled={isLoading}
            onChange={(e) => {
              setContent(e.target.value)
              if (error) setError(null)
            }}
          />
        </div>

        {/* Sample Topics Empty-State Aid */}
        <div className="summarizer-examples-row">
          <span className="summarizer-examples-label">Sample passages:</span>
          {SAMPLE_PASSAGES.map((sample) => (
            <button
              key={sample.title}
              type="button"
              className="summarizer-example-pill"
              onClick={() => handleSelectSample(sample.content)}
              disabled={isLoading}
            >
              📄 {sample.title}
            </button>
          ))}
        </div>

        {/* Length Selector */}
        <div className="summarizer-input-group">
          <span className="summarizer-label">Summary Length</span>
          <div
            className="summarizer-length-selector"
            role="radiogroup"
            aria-label="Summary length options"
          >
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={length === opt.id}
                className={`summarizer-length-btn ${length === opt.id ? 'selected' : ''}`}
                onClick={() => setLength(opt.id)}
                disabled={isLoading}
                id={`length-btn-${opt.id}`}
              >
                <div className="summarizer-length-header">
                  <span className="summarizer-length-title">{opt.label}</span>
                  <span className="summarizer-length-badge">{opt.badge}</span>
                </div>
                <span className="summarizer-length-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="ui-alert ui-alert-danger"
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}
          >
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="summarizer-actions">
          {content.trim() && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClear}
              disabled={isLoading}
              id="btn-clear-summary"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !content.trim()}
            id="btn-summarize"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                <span>EduGenie is summarizing...</span>
              </>
            ) : (
              <>
                <span>✨ Summarize Content</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Result Card */}
      {result && (
        <section
          className="summarizer-result-card"
          data-testid="summarizer-result"
          aria-labelledby="summary-result-title"
        >
          <div className="summarizer-result-header">
            <h3 id="summary-result-title" className="summarizer-result-title">
              📚 Educational Summary
            </h3>
            <div className="summarizer-result-meta">
              <span className="summarizer-badge">
                {result.length} length
              </span>
              {result.summary_length_chars && (
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {result.summary_length_chars} chars
                </span>
              )}
            </div>
          </div>

          {/* Main Summary Body rendered safely */}
          <div className="summarizer-summary-body" data-testid="summary-content">
            <SafeMarkdownRenderer content={result.summary} />
          </div>

          {/* Key Revision Points */}
          {result.key_points && result.key_points.length > 0 && (
            <div className="summarizer-key-points-section">
              <h4 className="summarizer-key-points-title">
                📌 Key Revision Takeaways ({result.key_points.length})
              </h4>
              <ul className="summarizer-key-points-list" data-testid="summary-key-points">
                {result.key_points.map((point, idx) => (
                  <li key={idx} className="summarizer-key-point-item">
                    <span className="summarizer-key-point-bullet">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Result Footer Actions */}
          <div className="summarizer-result-footer">
            <div className="summarizer-copy-feedback">
              {copied && <span>✓ Copied to clipboard!</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleCopySummary}
                id="btn-copy-summary"
              >
                📋 {copied ? 'Copied!' : 'Copy Summary'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClear}
              >
                New Summary
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

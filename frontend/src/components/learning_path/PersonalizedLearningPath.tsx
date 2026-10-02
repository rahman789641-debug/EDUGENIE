import React, { useState, useRef } from 'react'
import { learningPathApi } from '../../api/learning_path'
import type {
  LearningLevel,
  LearningPathResponse,
} from '../../types/learning_path'

const EXAMPLE_TOPICS = [
  'Python',
  'Java',
  'Web Development',
  'Data Structures',
  'Machine Learning',
  'SQL',
]

const LEVEL_OPTIONS: Array<{
  id: LearningLevel
  label: string
  badge: string
  desc: string
}> = [
  {
    id: 'beginner',
    label: 'Beginner',
    badge: 'Foundations',
    desc: 'Core syntax, mental models, prerequisites & first principles',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    badge: 'Applied',
    desc: 'Mechanisms, design patterns, architecture & practical systems',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    badge: 'Mastery',
    desc: 'High-performance tuning, scale, trade-offs & edge cases',
  },
]

export const PersonalizedLearningPath: React.FC = () => {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<LearningLevel>('beginner')
  const [goal, setGoal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LearningPathResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const topicInputRef = useRef<HTMLInputElement>(null)

  const handleSelectExample = (exampleTopic: string) => {
    setTopic(exampleTopic)
    setError(null)
    if (topicInputRef.current) {
      topicInputRef.current.focus()
    }
  }

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanTopic = topic.trim()
    if (!cleanTopic) {
      setError('Please enter a topic before generating a learning path.')
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

    const cleanGoal = goal.trim()
    if (cleanGoal.length > 1000) {
      setError('Goal must not exceed 1,000 characters.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await learningPathApi.getLearningRecommendations(
        cleanTopic,
        level,
        cleanGoal || undefined,
      )
      setResult(response)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to generate learning path right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPath = async () => {
    if (!result) return
    const stagesText = result.stages
      .map(
        (s) =>
          `Stage ${s.stage}: ${s.title} (${s.difficulty})\n` +
          `Concepts:\n${s.concepts.map((c) => `  • ${c}`).join('\n')}\n` +
          `Practice:\n${s.practice.map((p) => `  • ${p}`).join('\n')}\n` +
          `Resources:\n${s.resources.map((r) => `  • [${r.type.toUpperCase()}] ${r.title}`).join('\n')}`,
      )
      .join('\n\n')

    const fullText =
      `Personalized Learning Path: ${result.topic}\n` +
      `Level: ${result.level}${result.goal ? ` | Goal: ${result.goal}` : ''}\n\n` +
      `Overview:\n${result.overview}\n\n` +
      `${stagesText}\n\n` +
      `Next Steps:\n${result.next_steps.map((ns) => `• ${ns}`).join('\n')}`

    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    setTopic('')
    setGoal('')
    setResult(null)
    setError(null)
    if (topicInputRef.current) {
      topicInputRef.current.focus()
    }
  }

  return (
    <div className="learning-path-container" data-testid="personalized-learning-path">
      {/* Empty State Introductory Guidance */}
      <div className="learning-path-empty-banner" data-testid="learning-path-empty-state">
        <h3 className="learning-path-empty-title">
          <span>🗺️</span>
          <span>Build your learning path</span>
        </h3>
        <p className="learning-path-empty-subtitle">
          Tell EduGenie what you want to learn and your current level. Receive a structured, milestone-driven curriculum personalized toward your career or study aspirations.
        </p>
      </div>

      {/* Control Card: Topic, Level, Goal */}
      <form className="learning-path-control-card" onSubmit={handleGenerate}>
        {/* Topic Input */}
        <div className="learning-path-input-group">
          <label htmlFor="topic-input" className="learning-path-label">
            <span>Subject or Topic to Learn</span>
            <span className="learning-path-char-count">{topic.length} / 500</span>
          </label>
          <input
            id="topic-input"
            ref={topicInputRef}
            type="text"
            className="learning-path-input"
            placeholder="What do you want to learn? (e.g., Python Programming, Machine Learning, Web Development)..."
            value={topic}
            maxLength={500}
            disabled={isLoading}
            onChange={(e) => {
              setTopic(e.target.value)
              if (error) setError(null)
            }}
          />
        </div>

        {/* Example Topics */}
        <div className="learning-path-examples-row">
          <span className="learning-path-examples-label">Example topics:</span>
          {EXAMPLE_TOPICS.map((item) => (
            <button
              key={item}
              type="button"
              className="learning-path-example-pill"
              onClick={() => handleSelectExample(item)}
              disabled={isLoading}
              data-testid={`example-topic-${item.toLowerCase().replace(/\s+/g, '-')}`}
            >
              📚 {item}
            </button>
          ))}
        </div>

        {/* Level Selector */}
        <div className="learning-path-input-group">
          <span className="learning-path-label">Your Current Competency Level</span>
          <div
            className="learning-path-level-selector"
            role="radiogroup"
            aria-label="Learner level options"
          >
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={level === opt.id}
                className={`learning-path-level-btn ${level === opt.id ? 'selected' : ''}`}
                onClick={() => setLevel(opt.id)}
                disabled={isLoading}
                id={`level-btn-${opt.id}`}
                data-testid={`level-btn-${opt.id}`}
              >
                <div className="learning-path-level-header">
                  <span className="learning-path-level-title">{opt.label}</span>
                  <span className="learning-path-level-badge">{opt.badge}</span>
                </div>
                <span className="learning-path-level-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Goal Input */}
        <div className="learning-path-input-group">
          <label htmlFor="learning-goal-input" className="learning-path-label">
            <span>What is your learning goal? (Optional)</span>
            <span className="learning-path-char-count">{goal.length} / 1,000</span>
          </label>
          <input
            id="learning-goal-input"
            type="text"
            className="learning-path-input"
            placeholder="e.g., Become a backend developer, Prepare for interviews, Build practical ML projects..."
            value={goal}
            maxLength={1000}
            disabled={isLoading}
            onChange={(e) => {
              setGoal(e.target.value)
              if (error) setError(null)
            }}
          />
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

        {/* Action Buttons */}
        <div className="learning-path-actions">
          {(topic.trim() || goal.trim()) && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClear}
              disabled={isLoading}
              id="btn-clear-path"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !topic.trim()}
            id="btn-generate-path"
            data-testid="generate-path-btn"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                <span>Creating your personalized learning path...</span>
              </>
            ) : (
              <>
                <span>🚀 Generate Learning Path</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Result Area */}
      {result && (
        <section
          className="learning-path-result-card"
          data-testid="learning-path-result"
          aria-labelledby="learning-path-result-title"
        >
          {/* Header Metadata */}
          <div className="learning-path-header-meta">
            <div className="learning-path-title-row">
              <h3 id="learning-path-result-title" className="learning-path-topic-name">
                <span>🎯</span>
                <span>{result.topic}</span>
              </h3>
              <div className="learning-path-tags-row">
                <span className={`learning-path-badge learning-path-badge-${result.level}`}>
                  {result.level}
                </span>
                <span className="learning-path-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                  {result.total_stages} Stages
                </span>
              </div>
            </div>

            {result.goal && (
              <div style={{ marginTop: 'var(--space-1)' }}>
                <span className="learning-path-goal-tag">
                  🎯 Target Goal: <strong>{result.goal}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Strategic Overview */}
          <div className="learning-path-overview-box" data-testid="learning-path-overview">
            <strong>Strategic Roadmap Overview:</strong> {result.overview}
          </div>

          {/* Timeline Stages */}
          <div className="learning-path-timeline">
            {result.stages.map((stageItem) => (
              <div
                key={stageItem.stage}
                className="learning-path-stage-card"
                data-testid={`stage-card-${stageItem.stage}`}
              >
                {/* Stage Header */}
                <div className="learning-path-stage-header">
                  <div className="learning-path-stage-title-wrap">
                    <span className="learning-path-stage-number">{stageItem.stage}</span>
                    <h4 className="learning-path-stage-title">{stageItem.title}</h4>
                  </div>
                  <span className={`learning-path-badge learning-path-badge-${stageItem.difficulty}`}>
                    {stageItem.difficulty}
                  </span>
                </div>

                {/* Concepts & Practice Grid */}
                <div className="learning-path-section-grid">
                  {/* Concepts */}
                  <div className="learning-path-section-block">
                    <span className="learning-path-section-label">🎯 Core Concepts</span>
                    <ul className="learning-path-items-list" data-testid={`stage-concepts-${stageItem.stage}`}>
                      {stageItem.concepts.map((concept, idx) => (
                        <li key={idx} className="learning-path-item">
                          <span className="learning-path-item-bullet">•</span>
                          <span>{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Practice */}
                  <div className="learning-path-section-block">
                    <span className="learning-path-section-label">💻 Practical Application</span>
                    <ul className="learning-path-items-list" data-testid={`stage-practice-${stageItem.stage}`}>
                      {stageItem.practice.map((task, idx) => (
                        <li key={idx} className="learning-path-item">
                          <span className="learning-path-item-bullet">✓</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Resources */}
                {stageItem.resources && stageItem.resources.length > 0 && (
                  <div className="learning-path-resources-section">
                    <span className="learning-path-section-label">📚 Recommended Resources</span>
                    <div className="learning-path-resources-list" data-testid={`stage-resources-${stageItem.stage}`}>
                      {stageItem.resources.map((res, idx) => (
                        <div key={idx} className="learning-path-resource-row">
                          <span className="learning-path-resource-type-badge">{res.type}</span>
                          {res.url ? (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="learning-path-resource-link"
                            >
                              {res.title} ↗
                            </a>
                          ) : (
                            <span className="learning-path-resource-title">{res.title}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Next Steps */}
          {result.next_steps && result.next_steps.length > 0 && (
            <div className="learning-path-next-steps-card" data-testid="learning-path-next-steps">
              <h4 className="learning-path-next-steps-title">
                <span>🚀</span>
                <span>Next Steps & Advanced Direction</span>
              </h4>
              <ul className="learning-path-items-list">
                {result.next_steps.map((step, idx) => (
                  <li key={idx} className="learning-path-item">
                    <span className="learning-path-item-bullet">➔</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Result Footer Actions */}
          <div className="learning-path-result-footer">
            <div className="learning-path-copy-feedback">
              {copied && <span>✓ Copied to clipboard!</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleCopyPath}
                id="btn-copy-path"
              >
                📋 {copied ? 'Copied!' : 'Copy Learning Path'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClear}
              >
                New Path
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

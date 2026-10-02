import React, { useState, useRef } from 'react'
import { quizApi } from '../../api/quiz'
import type {
  QuizDifficulty,
  QuizResponse,
} from '../../types/quiz'

const SAMPLE_PASSAGES = [
  {
    title: 'Photosynthesis',
    content:
      'Photosynthesis is the biological process by which green plants, algae, and cyanobacteria convert light energy, usually from the Sun, into chemical energy stored in glucose. The process takes place inside cellular organelles called chloroplasts, which contain the green pigment chlorophyll. Water molecules absorbed by the roots are photolyzed into oxygen gas and protons, releasing oxygen into the atmosphere as a vital byproduct. Carbon dioxide from the air is then fixed in the stroma during the Calvin cycle, synthesizing glyceraldehyde 3-phosphate (G3P) which forms glucose.',
  },
  {
    title: 'REST Architecture',
    content:
      'Representational State Transfer (REST) is an architectural style for distributed hypermedia systems first formulated by Roy Fielding. REST systems are characterized by a client-server relationship, stateless communication where each request contains all context necessary to process it, and standard uniform interfaces utilizing HTTP methods. In REST, resources are uniquely identified by URIs, while standard HTTP verbs (GET, POST, PUT, DELETE, PATCH) define operations. GET requests are safe and idempotent, while POST creates new subordinate resources.',
  },
  {
    title: 'Binary Search',
    content:
      'Binary search is an efficient divide-and-conquer algorithm for finding an item from a sorted list of items. It works by repeatedly comparing the target value to the middle element of the array. If the target matches the middle element, its position is returned. If the target is less than the middle element, search continues in the lower half; otherwise, it proceeds in the upper half. By eliminating half of the remaining elements in each step, binary search achieves logarithmic O(log n) time complexity, outperforming linear search.',
  },
]

const DIFFICULTY_OPTIONS: Array<{
  id: QuizDifficulty
  label: string
  desc: string
}> = [
  {
    id: 'beginner',
    label: 'Beginner',
    desc: 'Foundational recall, definitions & core concepts',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    desc: 'Mechanisms, patterns & conceptual application',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    desc: 'Nuances, edge cases & deep analytical reasoning',
  },
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export const InteractiveQuiz: React.FC = () => {
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('beginner')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quizData, setQuizData] = useState<QuizResponse | null>(null)

  // User selections: question id -> selected option text
  const [userAnswers, setUserAnswers] = useState<Record<string | number, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSelectSample = (sampleText: string) => {
    setContent(sampleText)
    setError(null)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanContent = content.trim()
    if (!cleanContent) {
      setError('Please provide study text or lecture notes before generating a quiz.')
      return
    }

    if (cleanContent.length < 5) {
      setError('Study text must be at least 5 characters.')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)
    setUserAnswers({})
    setIsSubmitted(false)

    try {
      const response = await quizApi.generateQuiz(cleanContent, difficulty)
      setQuizData(response)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to generate quiz right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectOption = (questionId: string | number, option: string) => {
    if (isSubmitted) return // Prevent changing answers after submission
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }))
  }

  const handleSubmitQuiz = () => {
    if (!quizData) return
    setIsSubmitted(true)
  }

  const handleRetake = () => {
    setUserAnswers({})
    setIsSubmitted(false)
  }

  const handleResetAll = () => {
    setQuizData(null)
    setUserAnswers({})
    setIsSubmitted(false)
    setError(null)
  }

  // Calculate score
  const score = quizData?.questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.correct_answer ? acc + 1 : acc
  }, 0) ?? 0

  const totalQuestions = quizData?.questions.length ?? 0
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const allAnswered = totalQuestions > 0 && Object.keys(userAnswers).length === totalQuestions

  return (
    <div className="quiz-container" data-testid="interactive-quiz">
      {/* Quiz Generator Input Form (shown when no active quiz data) */}
      {!quizData && (
        <form className="quiz-control-card" onSubmit={handleGenerateQuiz}>
          <div className="explainer-input-group">
            <label htmlFor="quiz-content-input" className="explainer-label">
              <span>Study Notes, Textbook Excerpt, or Educational Passage</span>
              <span className="explainer-char-count">{content.length}/25000</span>
            </label>
            <textarea
              id="quiz-content-input"
              ref={textareaRef}
              className="quiz-content-textarea"
              placeholder="Paste study material, lecture notes, or key concepts here to generate 3 multiple-choice assessment questions..."
              value={content}
              disabled={isLoading}
              maxLength={25000}
              onChange={(e) => {
                setContent(e.target.value)
                if (error) setError(null)
              }}
              data-testid="quiz-content-input"
            />
          </div>

          {/* Difficulty Selector */}
          <div className="explainer-level-section">
            <span className="explainer-label">Assessment Difficulty</span>
            <div
              className="explainer-level-selector"
              role="radiogroup"
              aria-label="Quiz difficulty"
            >
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isLoading}
                    className={`explainer-level-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => setDifficulty(opt.id)}
                    data-testid={`diff-btn-${opt.id}`}
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
            <button
              type="submit"
              className="explainer-submit-btn"
              disabled={!content.trim() || isLoading}
              data-testid="generate-quiz-btn"
            >
              {isLoading ? (
                <>
                  <span className="chat-loading-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <span>Generate Quiz (3 Questions)</span>
                  <span aria-hidden="true">⚡</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="chat-error-banner" data-testid="quiz-error-banner">
          <div className="chat-error-content">
            <span className="chat-error-icon" aria-hidden="true">⚠️</span>
            <span className="chat-error-message">{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleGenerateQuiz()}
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="explainer-loading-card" data-testid="quiz-loading-state">
          <div className="chat-loading-wrapper">
            <div className="chat-loading-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <span className="explainer-loading-text">
              EduGenie is generating your quiz...
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
            Creating 3 targeted multiple-choice items at {difficulty} tier with plausible distractors
          </span>
        </div>
      )}

      {/* Empty State: shown when no quiz data and not loading */}
      {!isLoading && !quizData && (
        <div className="explainer-empty-card" data-testid="quiz-empty-state">
          <span className="explainer-empty-icon" aria-hidden="true">📝</span>
          <h3 className="explainer-empty-title">AI Quiz Generator</h3>
          <p className="explainer-empty-subtitle">
            Paste any study notes, textbook passage, or curriculum guide to generate 3 targeted questions with answer rationales.
          </p>
          <div className="explainer-suggestions-wrap">
            <span className="explainer-suggestions-label">Try sample material:</span>
            <div className="explainer-suggestions-pills">
              {SAMPLE_PASSAGES.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  className="explainer-suggestion-pill"
                  onClick={() => handleSelectSample(sample.content)}
                  data-testid={`sample-pill-${sample.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz Taker View */}
      {!isLoading && quizData && (
        <div className="quiz-active-area" data-testid="quiz-active-area">
          {/* Header & Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {quizData.title || 'Interactive Assessment'}
              </h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                {quizData.difficulty} tier • 3 questions
              </span>
            </div>
            <button
              type="button"
              className="chat-code-copy-btn"
              onClick={handleResetAll}
            >
              Create New Quiz
            </button>
          </div>

          {/* Submission Score Banner */}
          {isSubmitted && (
            <aside className="quiz-score-banner" data-testid="quiz-score-banner">
              <div className="quiz-score-text-group">
                <h4 className="quiz-score-title">
                  {score === totalQuestions
                    ? '🎉 Perfect Score! Outstanding Mastery!'
                    : score >= 2
                    ? '👏 Great Job! Solid Conceptual Understanding.'
                    : '📖 Keep Practicing! Review the Explanations Below.'}
                </h4>
                <p className="quiz-score-subtitle">
                  You answered {score} of {totalQuestions} questions correctly ({percentage}%).
                </p>
              </div>
              <div className="quiz-score-badge">
                {score} / {totalQuestions} ({percentage}%)
              </div>
            </aside>
          )}

          {/* Question Cards */}
          {quizData.questions.map((q, idx) => {
            const userChoice = userAnswers[q.id]
            const isUserCorrect = isSubmitted && userChoice === q.correct_answer

            let cardStateClass = ''
            if (isSubmitted) {
              cardStateClass = isUserCorrect ? 'correct-card' : 'incorrect-card'
            }

            return (
              <article
                key={q.id}
                className={`quiz-question-card ${cardStateClass}`}
                data-testid={`quiz-question-${idx + 1}`}
              >
                <div className="quiz-question-header">
                  <span className="quiz-question-number">Question {idx + 1} of {totalQuestions}</span>
                  {isSubmitted && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: isUserCorrect ? '#10b981' : '#ef4444' }}>
                      {isUserCorrect ? '✔ Correct' : '✖ Incorrect'}
                    </span>
                  )}
                </div>

                <h4 className="quiz-question-text">{q.question}</h4>

                <div className="quiz-options-grid">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userChoice === opt
                    const isThisCorrect = opt === q.correct_answer

                    let optionFeedbackClass = ''
                    if (isSubmitted) {
                      if (isThisCorrect) {
                        optionFeedbackClass = 'correct-choice'
                      } else if (isSelected && !isThisCorrect) {
                        optionFeedbackClass = 'wrong-choice'
                      }
                    } else if (isSelected) {
                      optionFeedbackClass = 'selected'
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        className={`quiz-option-btn ${optionFeedbackClass}`}
                        onClick={() => handleSelectOption(q.id, opt)}
                        data-testid={`option-btn-${idx + 1}-${optIdx + 1}`}
                      >
                        <span className="quiz-option-letter">
                          {OPTION_LETTERS[optIdx] || optIdx + 1}
                        </span>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {isSubmitted && isThisCorrect && (
                          <span style={{ fontSize: '13px', color: '#10b981' }} aria-label="Correct Choice">✔</span>
                        )}
                        {isSubmitted && isSelected && !isThisCorrect && (
                          <span style={{ fontSize: '13px', color: '#ef4444' }} aria-label="Incorrect Choice">✖</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Educational Explanation (shown after submission) */}
                {isSubmitted && (
                  <div className="quiz-explanation-box" data-testid={`explanation-box-${idx + 1}`}>
                    <strong>Rationale: </strong>
                    {q.explanation}
                  </div>
                )}
              </article>
            )
          })}

          {/* Quiz Action Bar */}
          <div className="quiz-footer-actions">
            {!isSubmitted ? (
              <button
                type="button"
                className="explainer-submit-btn"
                onClick={handleSubmitQuiz}
                disabled={!allAnswered}
                data-testid="submit-quiz-answers-btn"
              >
                <span>{allAnswered ? 'Submit Answers & Check Score' : `Answer all 3 questions (${Object.keys(userAnswers).length}/3)`}</span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRetake}
                  data-testid="retake-quiz-btn"
                >
                  🔄 Retake This Quiz
                </button>
                <button
                  type="button"
                  className="explainer-submit-btn"
                  onClick={handleResetAll}
                >
                  ✨ Generate New Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

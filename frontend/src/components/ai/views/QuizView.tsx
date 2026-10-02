import React, { useState } from 'react'
import type { QuizResponsePayload } from '../../../api/ai'
import { Button } from '../../ui/Button'

interface QuizViewProps {
  data: QuizResponsePayload
}

export const QuizView: React.FC<QuizViewProps> = ({ data }) => {
  // Store selected option index per question id
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  // Store whether answer has been checked per question id
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({})

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (checkedQuestions[questionId]) return // Locked once checked
    setSelectedOptions((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleCheckAnswer = (questionId: number) => {
    if (selectedOptions[questionId] === undefined) return
    setCheckedQuestions((prev) => ({ ...prev, [questionId]: true }))
  }

  const handleReset = () => {
    setSelectedOptions({})
    setCheckedQuestions({})
  }

  const checkedCount = Object.keys(checkedQuestions).length
  const correctCount = data.questions.filter(
    (q) => checkedQuestions[q.id] && selectedOptions[q.id] === q.correct_index
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Quiz Header & Metrics */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
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
            Difficulty: {data.difficulty}
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
            {data.total_questions} Questions
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {checkedCount > 0 && (
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: correctCount === checkedCount ? 'var(--color-success)' : 'var(--color-accent-amber)',
              }}
            >
              Score: {correctCount}/{checkedCount} ({Math.round((correctCount / checkedCount) * 100)}%)
            </div>
          )}

          {checkedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset Quiz
            </Button>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {data.questions.map((q, qIndex) => {
          const isChecked = Boolean(checkedQuestions[q.id])
          const selected = selectedOptions[q.id]
          const isCorrect = selected === q.correct_index

          return (
            <div
              key={q.id}
              id={`quiz-question-card-${q.id}`}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <span
                  style={{
                    background: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary-light)',
                    fontWeight: 700,
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    flexShrink: 0,
                  }}
                >
                  Q{qIndex + 1}
                </span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {q.question}
                </span>
              </div>

              {/* Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                {q.options.map((opt, optIndex) => {
                  const isSelected = selected === optIndex
                  let optionBg = 'var(--color-bg-input)'
                  let optionBorder = 'var(--border-subtle)'
                  let optionColor = 'var(--text-main)'

                  if (isChecked) {
                    if (optIndex === q.correct_index) {
                      // Correct option
                      optionBg = 'rgba(16, 185, 129, 0.15)'
                      optionBorder = 'var(--color-success)'
                      optionColor = 'var(--color-success)'
                    } else if (isSelected && !isCorrect) {
                      // Selected wrong option
                      optionBg = 'rgba(239, 68, 68, 0.15)'
                      optionBorder = 'var(--color-danger)'
                      optionColor = 'var(--color-danger)'
                    }
                  } else if (isSelected) {
                    optionBg = 'var(--color-primary-subtle)'
                    optionBorder = 'var(--color-primary)'
                    optionColor = 'var(--color-primary-light)'
                  }

                  return (
                    <button
                      key={optIndex}
                      id={`q${q.id}-option-${optIndex}`}
                      type="button"
                      disabled={isChecked}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: optionBg,
                        border: `1px solid ${optionBorder}`,
                        borderRadius: 'var(--radius-sm)',
                        color: optionColor,
                        fontSize: 'var(--text-sm)',
                        textAlign: 'left',
                        cursor: isChecked ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `1.5px solid ${optionBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {isChecked && optIndex === q.correct_index && (
                        <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Correct</span>
                      )}
                      {isChecked && isSelected && !isCorrect && (
                        <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>✗ Incorrect</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Action Button & Feedback */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'var(--space-2)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                {!isChecked ? (
                  <Button
                    id={`btn-check-q${q.id}`}
                    variant="secondary"
                    size="sm"
                    disabled={selected === undefined}
                    onClick={() => handleCheckAnswer(q.id)}
                  >
                    Check Answer
                  </Button>
                ) : (
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {isCorrect ? '🎉 Great job! Correct answer.' : '⚠️ Not quite right. Review explanation below.'}
                  </div>
                )}
              </div>

              {/* Explanation section when checked */}
              {isChecked && q.explanation && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: `3px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-accent-amber)'}`,
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginTop: 'var(--space-1)',
                  }}
                >
                  <strong style={{ color: 'var(--text-main)' }}>Explanation: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

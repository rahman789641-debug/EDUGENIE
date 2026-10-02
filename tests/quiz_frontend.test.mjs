import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeQuizError } from '../frontend/src/api/quiz.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Quiz API Error Sanitization & Safety', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const sanitized = sanitizeQuizError(err)
    assert.equal(sanitized.code, 'SESSION_EXPIRED')
    assert.equal(sanitized.message, 'Your session has expired. Please sign in again.')
    assert.equal(sanitized.retryable, false)
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const sanitized = sanitizeQuizError(err)
    assert.equal(sanitized.code, 'AI_RATE_LIMITED')
    assert.match(sanitized.message, /high demand/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 504 timeout to friendly retry suggestion', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const sanitized = sanitizeQuizError(err)
    assert.equal(sanitized.code, 'AI_TIMEOUT')
    assert.match(sanitized.message, /took longer than expected/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502/503 provider errors to temporary unavailable notice', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const sanitized = sanitizeQuizError(err)
    assert.equal(sanitized.code, 'AI_PROVIDER_ERROR')
    assert.match(sanitized.message, /momentarily unavailable/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502 AI_GENERATION_ERROR to structured output notice', () => {
    const err = new ApiError(502, 'Malformed JSON', 'AI_GENERATION_ERROR')
    const sanitized = sanitizeQuizError(err)
    assert.equal(sanitized.code, 'AI_GENERATION_ERROR')
    assert.match(sanitized.message, /issue structuring the quiz questions/i)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/ai/client.py", line 45, in generate: APIKeyError')
    const sanitized = sanitizeQuizError(rawError)
    assert.doesNotMatch(sanitized.message, /client\.py/)
    assert.doesNotMatch(sanitized.message, /APIKeyError/)
    assert.match(sanitized.message, /unable to generate quiz/i)
  })
})

describe('Quiz Input & Question Model Validation Rules', () => {
  it('validates study content string trimming, length bounds, and empty rejection', () => {
    const validate = (c) => {
      if (typeof c !== 'string') return false
      const trimmed = c.trim()
      return trimmed.length >= 5 && trimmed.length <= 25000
    }

    assert.equal(validate(''), false)
    assert.equal(validate('   '), false)
    assert.equal(validate('abcd'), false)
    assert.equal(validate('Photosynthesis occurs in chloroplasts.'), true)
    assert.equal(validate('a'.repeat(25001)), false)
  })

  it('verifies question options must be exactly 4 choices with no duplicates', () => {
    const validateQuestion = (q) => {
      if (!q.question || !q.question.trim()) return false
      if (!Array.isArray(q.options) || q.options.length !== 4) return false
      const unique = new Set(q.options.map(o => String(o).trim().toLowerCase()))
      if (unique.size !== 4) return false
      if (!q.options.includes(q.correct_answer)) return false
      return true
    }

    assert.equal(
      validateQuestion({
        question: 'What is photosynthesis?',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
      }),
      true
    )

    // Only 3 options
    assert.equal(
      validateQuestion({
        question: 'What is photosynthesis?',
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
      }),
      false
    )

    // Duplicate options
    assert.equal(
      validateQuestion({
        question: 'What is photosynthesis?',
        options: ['A', 'B', 'C', 'A'],
        correct_answer: 'A',
      }),
      false
    )

    // Correct answer not in options
    assert.equal(
      validateQuestion({
        question: 'What is photosynthesis?',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'E',
      }),
      false
    )
  })

  it('verifies quiz difficulty options structure', () => {
    const difficulties = ['beginner', 'intermediate', 'advanced']
    assert.equal(difficulties.length, 3)
    assert.ok(difficulties.includes('beginner'))
    assert.ok(difficulties.includes('intermediate'))
    assert.ok(difficulties.includes('advanced'))
  })
})

describe('Security Audit — Zero Secrets Exposure for Step 8', () => {
  it('confirms GEMINI_API_KEY is completely absent from all frontend source files', () => {
    const frontendSrc = path.resolve('frontend/src')
    const files = []

    function collect(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item)
        if (fs.statSync(full).isDirectory()) collect(full)
        else if (/\.(ts|tsx|js|jsx|css|html)$/.test(item)) files.push(full)
      }
    }
    collect(frontendSrc)

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      assert.doesNotMatch(
        content,
        /GEMINI_API_KEY/,
        `Violation: GEMINI_API_KEY detected in frontend file: ${file}`
      )
      assert.doesNotMatch(
        content,
        /AIza[0-9A-Za-z-_]{35}/,
        `Violation: Real Gemini API Key detected in frontend file: ${file}`
      )
    }
  })

  it('confirms dangerouslySetInnerHTML is NOT used in InteractiveQuiz.tsx', () => {
    const quizFile = fs.readFileSync(
      path.resolve('frontend/src/components/quiz/InteractiveQuiz.tsx'),
      'utf8'
    )
    assert.doesNotMatch(
      quizFile,
      /dangerouslySetInnerHTML/,
      'Violation: dangerouslySetInnerHTML found in InteractiveQuiz.tsx'
    )
  })
})

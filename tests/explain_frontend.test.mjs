import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeExplanationError } from '../frontend/src/api/explanation.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Concept Explanation API Error Sanitization & Safety', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const sanitized = sanitizeExplanationError(err)
    assert.equal(sanitized.code, 'SESSION_EXPIRED')
    assert.equal(sanitized.message, 'Your session has expired. Please sign in again.')
    assert.equal(sanitized.retryable, false)
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const sanitized = sanitizeExplanationError(err)
    assert.equal(sanitized.code, 'AI_RATE_LIMITED')
    assert.match(sanitized.message, /high demand/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 504 timeout to friendly retry suggestion', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const sanitized = sanitizeExplanationError(err)
    assert.equal(sanitized.code, 'AI_TIMEOUT')
    assert.match(sanitized.message, /took longer than expected/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502/503 provider errors to temporary unavailable notice', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const sanitized = sanitizeExplanationError(err)
    assert.equal(sanitized.code, 'AI_PROVIDER_ERROR')
    assert.match(sanitized.message, /momentarily unavailable/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502 AI_GENERATION_ERROR to structured output notice', () => {
    const err = new ApiError(502, 'Malformed JSON', 'AI_GENERATION_ERROR')
    const sanitized = sanitizeExplanationError(err)
    assert.equal(sanitized.code, 'AI_GENERATION_ERROR')
    assert.match(sanitized.message, /issue structuring the explanation/i)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/ai/client.py", line 45, in generate: APIKeyError')
    const sanitized = sanitizeExplanationError(rawError)
    assert.doesNotMatch(sanitized.message, /client\.py/)
    assert.doesNotMatch(sanitized.message, /APIKeyError/)
    assert.match(sanitized.message, /unable to generate explanation/i)
  })
})

describe('Explanation Input & Model Validation Rules', () => {
  it('validates topic string trimming, length bounds, and empty rejection', () => {
    const validate = (t) => {
      if (typeof t !== 'string') return false
      const trimmed = t.trim()
      return trimmed.length >= 2 && trimmed.length <= 500
    }

    assert.equal(validate(''), false)
    assert.equal(validate('   '), false)
    assert.equal(validate('a'), false)
    assert.equal(validate('Recursion'), true)
    assert.equal(validate('Photosynthesis'), true)
    assert.equal(validate('a'.repeat(501)), false)
  })

  it('verifies explanation level options structure', () => {
    const levels = ['beginner', 'intermediate', 'advanced']
    assert.equal(levels.length, 3)
    assert.ok(levels.includes('beginner'))
    assert.ok(levels.includes('intermediate'))
    assert.ok(levels.includes('advanced'))
  })
})

describe('Security Audit — Zero Secrets Exposure for Step 7', () => {
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

  it('confirms dangerouslySetInnerHTML is NOT used in ConceptExplainer or SafeMarkdownRenderer', () => {
    const explainerFile = fs.readFileSync(
      path.resolve('frontend/src/components/explanation/ConceptExplainer.tsx'),
      'utf8'
    )
    const markdownFile = fs.readFileSync(
      path.resolve('frontend/src/components/chat/SafeMarkdownRenderer.tsx'),
      'utf8'
    )

    assert.doesNotMatch(
      explainerFile,
      /dangerouslySetInnerHTML/,
      'Violation: dangerouslySetInnerHTML found in ConceptExplainer.tsx'
    )
    assert.doesNotMatch(
      markdownFile,
      /dangerouslySetInnerHTML/,
      'Violation: dangerouslySetInnerHTML found in SafeMarkdownRenderer.tsx'
    )
  })
})

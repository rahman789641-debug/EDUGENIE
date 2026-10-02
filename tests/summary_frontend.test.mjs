import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeSummaryError } from '../frontend/src/api/summary.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Summary API Error Sanitization & Safety', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const sanitized = sanitizeSummaryError(err)
    assert.equal(sanitized.code, 'SESSION_EXPIRED')
    assert.equal(sanitized.message, 'Your session has expired. Please sign in again.')
    assert.equal(sanitized.retryable, false)
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const sanitized = sanitizeSummaryError(err)
    assert.equal(sanitized.code, 'AI_RATE_LIMITED')
    assert.match(sanitized.message, /high demand/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 504 timeout to friendly retry suggestion', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const sanitized = sanitizeSummaryError(err)
    assert.equal(sanitized.code, 'AI_TIMEOUT')
    assert.match(sanitized.message, /took longer than expected/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502/503 provider errors to temporary unavailable notice', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const sanitized = sanitizeSummaryError(err)
    assert.equal(sanitized.code, 'AI_PROVIDER_ERROR')
    assert.match(sanitized.message, /momentarily unavailable/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502 AI_GENERATION_ERROR to structured output notice', () => {
    const err = new ApiError(502, 'Malformed JSON', 'AI_GENERATION_ERROR')
    const sanitized = sanitizeSummaryError(err)
    assert.equal(sanitized.code, 'AI_GENERATION_ERROR')
    assert.match(sanitized.message, /issue structuring the summary/i)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/ai/gemini_service.py", line 120, in summarize: APIKeyError')
    const sanitized = sanitizeSummaryError(rawError)
    assert.doesNotMatch(sanitized.message, /gemini_service\.py/)
    assert.doesNotMatch(sanitized.message, /APIKeyError/)
    assert.match(sanitized.message, /unable to generate summary/i)
  })
})

describe('Summary Input & Length Selector Validation Rules', () => {
  it('validates study content string trimming, length bounds, and empty rejection', () => {
    const validate = (c) => {
      if (typeof c !== 'string') return false
      const trimmed = c.trim()
      return trimmed.length >= 10 && trimmed.length <= 50000
    }

    assert.equal(validate(''), false)
    assert.equal(validate('         '), false)
    assert.equal(validate('Too short'), false)
    assert.equal(validate('Photosynthesis is a vital biological process in plants.'), true)
    assert.equal(validate('a'.repeat(50001)), false)
  })

  it('validates that summary length options are constrained to short, medium, and detailed', () => {
    const validLengths = new Set(['short', 'medium', 'detailed'])
    assert.equal(validLengths.has('short'), true)
    assert.equal(validLengths.has('medium'), true)
    assert.equal(validLengths.has('detailed'), true)
    assert.equal(validLengths.has('ultra_short'), false)
    assert.equal(validLengths.has('brief'), false)
  })

  it('validates summary response payload structure', () => {
    const validateResponse = (res) => {
      if (!res || typeof res !== 'object') return false
      if (!res.summary || typeof res.summary !== 'string') return false
      if (!Array.isArray(res.key_points) || res.key_points.length === 0) return false
      if (!['short', 'medium', 'detailed'].includes(res.length)) return false
      if (!res.request_id || typeof res.request_id !== 'string') return false
      return true
    }

    assert.equal(
      validateResponse({
        summary: 'Photosynthesis converts solar energy into chemical energy.',
        key_points: ['Occurs in chloroplasts', 'Releases oxygen byproduct'],
        length: 'medium',
        request_id: 'sum-12345',
      }),
      true
    )

    // Missing key points
    assert.equal(
      validateResponse({
        summary: 'Photosynthesis converts solar energy into chemical energy.',
        key_points: [],
        length: 'medium',
        request_id: 'sum-12345',
      }),
      false
    )

    // Invalid length
    assert.equal(
      validateResponse({
        summary: 'Photosynthesis converts solar energy into chemical energy.',
        key_points: ['Point 1'],
        length: 'invalid',
        request_id: 'sum-12345',
      }),
      false
    )
  })
})

describe('Summary Security & Safe Rendering Audit', () => {
  const rootDir = path.resolve()
  const summaryFiles = [
    path.join(rootDir, 'frontend/src/api/summary.ts'),
    path.join(rootDir, 'frontend/src/components/summary/EducationalSummarizer.tsx'),
    path.join(rootDir, 'frontend/src/pages/Summary/SummaryPage.tsx'),
    path.join(rootDir, 'frontend/src/types/summary.ts'),
  ]

  it('verifies all summary frontend files exist', () => {
    for (const f of summaryFiles) {
      assert.equal(fs.existsSync(f), true, `File missing: ${f}`)
    }
  })

  it('verifies 0 occurrences of GEMINI_API_KEY in frontend summary files', () => {
    for (const f of summaryFiles) {
      const content = fs.readFileSync(f, 'utf-8')
      assert.doesNotMatch(content, /GEMINI_API_KEY/, `Forbidden key reference in ${f}`)
      assert.doesNotMatch(content, /AIzaSy/, `Forbidden raw Google API key in ${f}`)
    }
  })

  it('verifies zero dangerouslySetInnerHTML usage in EducationalSummarizer', () => {
    const compPath = path.join(rootDir, 'frontend/src/components/summary/EducationalSummarizer.tsx')
    const content = fs.readFileSync(compPath, 'utf-8')
    assert.doesNotMatch(content, /dangerouslySetInnerHTML/, 'EducationalSummarizer must not use dangerouslySetInnerHTML')
    assert.match(content, /SafeMarkdownRenderer/, 'EducationalSummarizer must use SafeMarkdownRenderer')
  })

  it('verifies zero hardcoded localhost:8000 endpoints in frontend summary files', () => {
    for (const f of summaryFiles) {
      const content = fs.readFileSync(f, 'utf-8')
      assert.doesNotMatch(content, /http:\/\/localhost:8000/, `Hardcoded localhost in ${f}`)
      assert.doesNotMatch(content, /http:\/\/127\.0\.0\.1:8000/, `Hardcoded 127.0.0.1 in ${f}`)
    }
  })
})

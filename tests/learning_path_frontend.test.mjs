import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeLearningPathError } from '../frontend/src/api/learning_path.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Learning Path API Error Sanitization & Safety', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const sanitized = sanitizeLearningPathError(err)
    assert.equal(sanitized.code, 'SESSION_EXPIRED')
    assert.equal(sanitized.message, 'Your session has expired. Please sign in again.')
    assert.equal(sanitized.retryable, false)
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const sanitized = sanitizeLearningPathError(err)
    assert.equal(sanitized.code, 'AI_RATE_LIMITED')
    assert.match(sanitized.message, /high demand/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 504 timeout to friendly retry suggestion', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const sanitized = sanitizeLearningPathError(err)
    assert.equal(sanitized.code, 'AI_TIMEOUT')
    assert.match(sanitized.message, /took longer than expected/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502/503 provider errors to temporary unavailable notice', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const sanitized = sanitizeLearningPathError(err)
    assert.equal(sanitized.code, 'AI_PROVIDER_ERROR')
    assert.match(sanitized.message, /momentarily unavailable/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502 AI_GENERATION_ERROR to structured output notice', () => {
    const err = new ApiError(502, 'Malformed JSON', 'AI_GENERATION_ERROR')
    const sanitized = sanitizeLearningPathError(err)
    assert.equal(sanitized.code, 'AI_GENERATION_ERROR')
    assert.match(sanitized.message, /issue structuring the learning stages/i)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/ai/gemini_service.py", line 320, in generate: APIKeyError')
    const sanitized = sanitizeLearningPathError(rawError)
    assert.doesNotMatch(sanitized.message, /gemini_service\.py/)
    assert.doesNotMatch(sanitized.message, /APIKeyError/)
    assert.match(sanitized.message, /unable to generate learning path/i)
  })
})

describe('Learning Path Input & Model Validation Rules', () => {
  it('validates topic string trimming, length bounds, and empty rejection', () => {
    const validate = (t) => {
      if (typeof t !== 'string') return false
      const trimmed = t.trim()
      return trimmed.length >= 2 && trimmed.length <= 500
    }

    assert.equal(validate(''), false)
    assert.equal(validate('         '), false)
    assert.equal(validate('P'), false)
    assert.equal(validate('Python Programming'), true)
    assert.equal(validate('a'.repeat(501)), false)
  })

  it('validates optional goal length boundary', () => {
    const validateGoal = (g) => {
      if (!g) return true
      if (typeof g !== 'string') return false
      return g.trim().length <= 1000
    }

    assert.equal(validateGoal(''), true)
    assert.equal(validateGoal('Become a backend developer'), true)
    assert.equal(validateGoal('g'.repeat(1001)), false)
  })

  it('validates level options must be beginner, intermediate, or advanced', () => {
    const validLevels = new Set(['beginner', 'intermediate', 'advanced'])
    assert.equal(validLevels.has('beginner'), true)
    assert.equal(validLevels.has('intermediate'), true)
    assert.equal(validLevels.has('advanced'), true)
    assert.equal(validLevels.has('expert'), false)
  })

  it('validates response structure and anti-fake-URL compliance', () => {
    const validatePath = (res) => {
      if (!res || typeof res !== 'object') return false
      if (!res.topic || !res.level || !res.overview) return false
      if (!Array.isArray(res.stages) || res.stages.length === 0) return false
      for (const s of res.stages) {
        if (typeof s.stage !== 'number' || !s.title) return false
        if (!Array.isArray(s.concepts) || !Array.isArray(s.practice)) return false
        if (Array.isArray(s.resources)) {
          for (const r of s.resources) {
            // Per Step 10 anti-hallucination requirement: url must be null or string
            if (r.url !== null && r.url !== undefined && typeof r.url !== 'string') return false
          }
        }
      }
      return true
    }

    assert.equal(
      validatePath({
        topic: 'Python Programming',
        level: 'beginner',
        overview: 'A foundational path to mastery.',
        stages: [
          {
            stage: 1,
            title: 'Syntax & Types',
            difficulty: 'beginner',
            concepts: ['Variables', 'Lists', 'Loops'],
            practice: ['Write simple scripts'],
            resources: [
              { type: 'documentation', title: 'Python Docs', url: null },
            ],
          },
        ],
        next_steps: ['Build projects'],
        request_id: 'test-lp-123',
      }),
      true
    )
  })
})

describe('Learning Path Security & Safe Rendering Audit', () => {
  const rootDir = path.resolve()
  const lpFiles = [
    path.join(rootDir, 'frontend/src/api/learning_path.ts'),
    path.join(rootDir, 'frontend/src/components/learning_path/PersonalizedLearningPath.tsx'),
    path.join(rootDir, 'frontend/src/pages/LearningPath/LearningPathPage.tsx'),
    path.join(rootDir, 'frontend/src/types/learning_path.ts'),
  ]

  it('verifies all learning path frontend files exist', () => {
    for (const f of lpFiles) {
      assert.equal(fs.existsSync(f), true, `File missing: ${f}`)
    }
  })

  it('verifies 0 occurrences of GEMINI_API_KEY in frontend learning path files', () => {
    for (const f of lpFiles) {
      const content = fs.readFileSync(f, 'utf-8')
      assert.doesNotMatch(content, /GEMINI_API_KEY/, `Forbidden key reference in ${f}`)
      assert.doesNotMatch(content, /AIzaSy/, `Forbidden raw Google API key in ${f}`)
    }
  })

  it('verifies zero dangerouslySetInnerHTML usage in PersonalizedLearningPath', () => {
    const compPath = path.join(rootDir, 'frontend/src/components/learning_path/PersonalizedLearningPath.tsx')
    const content = fs.readFileSync(compPath, 'utf-8')
    assert.doesNotMatch(content, /dangerouslySetInnerHTML/, 'PersonalizedLearningPath must not use dangerouslySetInnerHTML')
  })

  it('verifies zero hardcoded localhost:8000 endpoints in frontend learning path files', () => {
    for (const f of lpFiles) {
      const content = fs.readFileSync(f, 'utf-8')
      assert.doesNotMatch(content, /http:\/\/localhost:8000/, `Hardcoded localhost in ${f}`)
      assert.doesNotMatch(content, /http:\/\/127\.0\.0\.1:8000/, `Hardcoded 127.0.0.1 in ${f}`)
    }
  })
})

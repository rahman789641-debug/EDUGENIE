import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeResearchError } from '../frontend/src/api/research.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Web Research API Error Sanitization & Safety', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const sanitized = sanitizeResearchError(err)
    assert.equal(sanitized.code, 'SESSION_EXPIRED')
    assert.equal(sanitized.message, 'Your session has expired. Please sign in again.')
    assert.equal(sanitized.retryable, false)
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const sanitized = sanitizeResearchError(err)
    assert.equal(sanitized.code, 'AI_RATE_LIMITED')
    assert.match(sanitized.message, /high demand/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 504 timeout to friendly retry suggestion', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const sanitized = sanitizeResearchError(err)
    assert.equal(sanitized.code, 'AI_TIMEOUT')
    assert.match(sanitized.message, /took longer than expected/i)
    assert.equal(sanitized.retryable, true)
  })

  it('maps 502/503 provider errors to temporary unavailable notice', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const sanitized = sanitizeResearchError(err)
    assert.equal(sanitized.code, 'AI_PROVIDER_ERROR')
    assert.match(sanitized.message, /momentarily unavailable/i)
    assert.equal(sanitized.retryable, true)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/web_research_service.py", line 120: DuckDuckGoError: Key=AIzaSySecret')
    const sanitized = sanitizeResearchError(rawError)
    assert.doesNotMatch(sanitized.message, /web_research_service\.py/)
    assert.doesNotMatch(sanitized.message, /AIzaSySecret/)
    assert.match(sanitized.message, /unable to complete web research/i)
  })
})

describe('Web Research Input Validation Rules', () => {
  it('rejects empty and whitespace-only queries', () => {
    const validate = (q) => {
      const trimmed = q.trim()
      if (!trimmed) throw new Error('Query empty')
      if (trimmed.length < 2) throw new Error('Query too short')
      if (trimmed.length > 1000) throw new Error('Query too long')
      return trimmed
    }

    assert.throws(() => validate(''), /Query empty/)
    assert.throws(() => validate('   '), /Query empty/)
    assert.throws(() => validate('a'), /Query too short/)
    assert.equal(validate('  What is FastAPI?  '), 'What is FastAPI?')
    assert.throws(() => validate('a'.repeat(1001)), /Query too long/)
  })
})

describe('Web Research Frontend Component Security & Integrity', () => {
  const rootDir = process.cwd()
  const assistantPath = path.join(rootDir, 'frontend/src/components/research/WebResearchAssistant.tsx')
  const pagePath = path.join(rootDir, 'frontend/src/pages/Research/ResearchPage.tsx')
  const appRoutesPath = path.join(rootDir, 'frontend/src/routes/AppRoutes.tsx')
  const sidebarPath = path.join(rootDir, 'frontend/src/components/layout/Sidebar.tsx')

  it('ensures WebResearchAssistant.tsx exists and contains no dangerouslySetInnerHTML', () => {
    const content = fs.readFileSync(assistantPath, 'utf8')
    assert.doesNotMatch(content, /dangerouslySetInnerHTML/)
    assert.match(content, /SafeMarkdownRenderer/)
  })

  it('ensures external source links include target="_blank" and rel="noopener noreferrer"', () => {
    const content = fs.readFileSync(assistantPath, 'utf8')
    assert.match(content, /target="_blank"/)
    assert.match(content, /rel="noopener noreferrer"/)
  })

  it('ensures API key or auth token secrets are never referenced in frontend code', () => {
    const content = fs.readFileSync(assistantPath, 'utf8')
    assert.doesNotMatch(content, /GEMINI_API_KEY/)
    assert.doesNotMatch(content, /TAVILY_API_KEY/)
  })

  it('verifies /research route is registered in AppRoutes.tsx and Sidebar.tsx', () => {
    const routesContent = fs.readFileSync(appRoutesPath, 'utf8')
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')

    assert.match(routesContent, /path="\/research"/)
    assert.match(routesContent, /ResearchPage/)

    assert.match(sidebarContent, /id:\s*'research'/)
    assert.match(sidebarContent, /path:\s*'\/research'/)
  })
})

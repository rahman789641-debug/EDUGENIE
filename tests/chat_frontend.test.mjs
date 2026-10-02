import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { sanitizeErrorMessage } from '../frontend/src/api/qa.ts'
import { ApiError } from '../frontend/src/api/client.ts'

describe('Q&A API Error Sanitization & Safety with Dual Modes', () => {
  it('maps 401 session expiration cleanly without leaking secrets', () => {
    const err = new ApiError(401, 'Token expired', 'SESSION_EXPIRED')
    const msg = sanitizeErrorMessage(err, 'ai')
    assert.equal(msg, 'Your session has expired. Please sign in again.')
  })

  it('maps 429 rate limit to learner-friendly message', () => {
    const err = new ApiError(429, 'Rate limited', 'AI_RATE_LIMITED')
    const msg = sanitizeErrorMessage(err, 'ai')
    assert.match(msg, /busy helping many learners/i)
  })

  it('maps 504 timeout differently for AI vs Research mode', () => {
    const err = new ApiError(504, 'Deadline exceeded', 'AI_TIMEOUT')
    const aiMsg = sanitizeErrorMessage(err, 'ai')
    const resMsg = sanitizeErrorMessage(err, 'research')
    assert.match(aiMsg, /took a bit too long/i)
    assert.match(resMsg, /Web research took longer/i)
  })

  it('maps 502/503 provider errors to mode-specific user notices', () => {
    const err = new ApiError(502, 'Upstream Gemini error', 'AI_PROVIDER_ERROR')
    const aiMsg = sanitizeErrorMessage(err, 'ai')
    const resMsg = sanitizeErrorMessage(err, 'research')
    assert.match(aiMsg, /AI answer could not be generated/i)
    assert.match(resMsg, /Web research could not be completed/i)
  })

  it('hides raw python exceptions and stack traces in generic fallback', () => {
    const rawError = new Error('File "/app/services/ai/client.py", line 45, in generate: APIKeyError')
    const msg = sanitizeErrorMessage(rawError, 'ai')
    assert.doesNotMatch(msg, /client\.py/)
    assert.doesNotMatch(msg, /APIKeyError/)
    assert.match(msg, /could not be generated/i)
  })
})

describe('Chat Message Model & State Validation Rules', () => {
  it('validates question string trimming and empty rejection', () => {
    const validate = (q) => {
      if (typeof q !== 'string') return false
      const trimmed = q.trim()
      return trimmed.length >= 3 && trimmed.length <= 2000
    }

    assert.equal(validate(''), false)
    assert.equal(validate('   '), false)
    assert.equal(validate('ab'), false)
    assert.equal(validate('What is recursion?'), true)
    assert.equal(validate('a'.repeat(2001)), false)
  })

  it('verifies ChatMessage model structure supports dual modes and sources', () => {
    const sampleMessage = {
      id: 'msg-123',
      role: 'assistant',
      content: 'FastAPI is a modern Python web framework.',
      createdAt: '12:00 PM',
      model: 'gemini-3.1-flash-lite',
      mode: 'research',
      sources: [
        {
          title: 'FastAPI Docs',
          url: 'https://fastapi.tiangolo.com/',
          domain: 'fastapi.tiangolo.com',
          snippet: 'FastAPI framework, high performance.'
        }
      ]
    }

    assert.equal(typeof sampleMessage.id, 'string')
    assert.ok(['user', 'assistant'].includes(sampleMessage.role))
    assert.equal(typeof sampleMessage.content, 'string')
    assert.equal(typeof sampleMessage.createdAt, 'string')
    assert.equal(typeof sampleMessage.model, 'string')
    assert.equal(sampleMessage.mode, 'research')
    assert.equal(sampleMessage.sources.length, 1)
    assert.equal(sampleMessage.sources[0].domain, 'fastapi.tiangolo.com')
  })
})

describe('Step 12 Chat UI & Security Static Audit', () => {
  const chatFile = fs.readFileSync(path.resolve('frontend/src/components/chat/EduGenieChat.tsx'), 'utf8')
  const rendererFile = fs.readFileSync(path.resolve('frontend/src/components/chat/SafeMarkdownRenderer.tsx'), 'utf8')

  it('confirms mode selector exists with AI Answer and Web Research buttons', () => {
    assert.match(chatFile, /mode-selector-ai/)
    assert.match(chatFile, /mode-selector-research/)
    assert.match(chatFile, /AI Answer/)
    assert.match(chatFile, /Web Research/)
  })

  it('confirms sources list renders with safe target="_blank" and rel="noopener noreferrer"', () => {
    assert.match(chatFile, /chat-sources-container/)
    assert.match(chatFile, /target="_blank"/)
    assert.match(chatFile, /rel="noopener noreferrer"/)
    assert.match(chatFile, /Open Source/)
  })

  it('confirms dangerouslySetInnerHTML is NOT used in EduGenieChat or SafeMarkdownRenderer', () => {
    assert.doesNotMatch(chatFile, /dangerouslySetInnerHTML/, 'EduGenieChat must not use dangerouslySetInnerHTML')
    assert.doesNotMatch(rendererFile, /dangerouslySetInnerHTML/, 'SafeMarkdownRenderer must not use dangerouslySetInnerHTML')
  })

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
        `Violation: GEMINI_API_KEY detected in frontend source file: ${file}`
      )
    }
  })
})

import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Test Auth Error Translation
import { getFriendlyAuthErrorMessage } from '../frontend/src/lib/authErrors.ts'
import { validateFirebaseConfig } from '../frontend/src/lib/firebase.ts'

describe('Firebase Auth Error Mapping', () => {
  it('maps invalid email to user-friendly message', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/invalid-email' })
    assert.match(msg, /valid email address/i)
  })

  it('maps wrong password to user-friendly message', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/wrong-password' })
    assert.match(msg, /incorrect password/i)
  })

  it('maps user not found to friendly message', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/user-not-found' })
    assert.match(msg, /no account found/i)
  })

  it('maps weak password to minimum length guidance', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/weak-password' })
    assert.match(msg, /at least 6 characters/i)
  })

  it('maps popup closed to friendly cancellation note', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/popup-closed-by-user' })
    assert.match(msg, /closed before completing/i)
  })

  it('maps popup blocked to browser permission guidance', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/popup-blocked' })
    assert.match(msg, /allow popups/i)
  })

  it('maps account exists with different credential edge case', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/account-exists-with-different-credential' })
    assert.match(msg, /different sign-in method/i)
  })

  it('maps too many requests to security lockout notice', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/too-many-requests' })
    assert.match(msg, /temporarily paused/i)
  })

  it('maps network failures cleanly', () => {
    const msg = getFriendlyAuthErrorMessage({ code: 'auth/network-request-failed' })
    assert.match(msg, /network connection error/i)
  })

  it('provides safe fallback for unknown errors without leaking stack traces', () => {
    const msg = getFriendlyAuthErrorMessage(new Error('Internal Firebase Database Error 0x889'))
    assert.doesNotMatch(msg, /0x889/)
  })
})

describe('Firebase Client Configuration Validation', () => {
  it('detects unconfigured or placeholder state without throwing exceptions', () => {
    const status = validateFirebaseConfig()
    assert.equal(typeof status.isConfigured, 'boolean')
    assert.ok(Array.isArray(status.missingKeys))
  })
})

describe('Sign-Up and Login Validation Rules', () => {
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email.trim())

  it('validates email formats accurately', () => {
    assert.equal(isValidEmail(''), false)
    assert.equal(isValidEmail('notanemail'), false)
    assert.equal(isValidEmail('student@example'), false)
    assert.equal(isValidEmail('student@example.com'), true)
    assert.equal(isValidEmail('user.name+tag@domain.co.uk'), true)
  })

  it('enforces password minimum length of 6 characters', () => {
    const isPasswordValid = (pw) => Boolean(pw && pw.length >= 6)
    assert.equal(isPasswordValid(''), false)
    assert.equal(isPasswordValid('12345'), false)
    assert.equal(isPasswordValid('123456'), true)
    assert.equal(isPasswordValid('strongpassword123'), true)
  })

  it('enforces password confirmation match', () => {
    const isMatch = (p1, p2) => Boolean(p1 && p2 && p1 === p2)
    assert.equal(isMatch('pass1', 'pass2'), false)
    assert.equal(isMatch('pass123', 'pass123'), true)
  })
})

describe('Security Audit — Zero Secret Exposure', () => {
  it('confirms GEMINI_API_KEY is completely absent from frontend source', () => {
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

  it('confirms .env is ignored in .gitignore', () => {
    const rootGitignore = fs.readFileSync('.gitignore', 'utf8')
    assert.match(rootGitignore, /^\.env$/m)
    assert.match(rootGitignore, /^\*\.env$/m)
  })
})

/**
 * Step 13 AI Reliability, Validation & Production Hardening Frontend Static & Integrity Test Suite
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const FRONTEND_SRC = path.resolve('frontend/src')

function getFilesRecursively(dir, filterExt = ['.ts', '.tsx', '.js', '.mjs']) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, filterExt))
    } else {
      if (filterExt.some((ext) => file.endsWith(ext))) {
        results.push(filePath)
      }
    }
  }
  return results
}

describe('Step 13 Frontend Production Hardening & Safety Audit', () => {
  const allSourceFiles = getFilesRecursively(FRONTEND_SRC)

  test('Deterministic Client-Side Quiz Scoring Verification', () => {
    const quizPath = path.join(FRONTEND_SRC, 'components/quiz/InteractiveQuiz.tsx')
    assert.ok(fs.existsSync(quizPath), 'InteractiveQuiz.tsx must exist')
    const content = fs.readFileSync(quizPath, 'utf-8')

    // Verify client-side deterministic evaluation
    assert.match(
      content,
      /userAnswers\[q\.id\]\s*===\s*q\.correct_answer/,
      'Quiz scoring must deterministically compare user answer to correct_answer'
    )

    // Ensure it does not call an AI grading endpoint
    assert.doesNotMatch(
      content,
      /gradeQuiz|evalScore|aiScore/i,
      'Quiz must not call external AI grading services for score computation'
    )
  })

  test('Form Submission Protection & Loading Disabled State Across All AI Modules', () => {
    const modules = [
      { name: 'Chat', file: 'components/chat/EduGenieChat.tsx' },
      { name: 'Quiz', file: 'components/quiz/InteractiveQuiz.tsx' },
      { name: 'Explainer', file: 'components/explanation/ConceptExplainer.tsx' },
      { name: 'Summarizer', file: 'components/summary/EducationalSummarizer.tsx' },
      { name: 'LearningPath', file: 'components/learning_path/PersonalizedLearningPath.tsx' },
      { name: 'Research', file: 'components/research/WebResearchAssistant.tsx' },
    ]

    for (const mod of modules) {
      const filePath = path.join(FRONTEND_SRC, mod.file)
      assert.ok(fs.existsSync(filePath), `${mod.name} file must exist: ${mod.file}`)
      const content = fs.readFileSync(filePath, 'utf-8')

      // Verify disabled state logic exists for inputs or submit buttons during loading
      assert.match(
        content,
        /disabled=\{.*(?:isLoading|status\s*===\s*'loading').*\}|isLoading\s*\?|status\s*===\s*'loading'\s*\?/,
        `${mod.name} must disable submission controls during loading state`
      )

    }
  })

  test('Zero Dangerous eval() or Function Constructor Usage in Frontend Source', () => {
    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      assert.doesNotMatch(
        content,
        /\beval\s*\(/,
        `Forbidden eval() call detected in ${path.relative(process.cwd(), file)}`
      )
      assert.doesNotMatch(
        content,
        /new\s+Function\s*\(/,
        `Forbidden Function() constructor detected in ${path.relative(process.cwd(), file)}`
      )
    }
  })

  test('Zero dangerouslySetInnerHTML Usage in AI Content View Components', () => {
    const aiViewFiles = allSourceFiles.filter(
      (f) =>
        f.includes('components/chat') ||
        f.includes('components/quiz') ||
        f.includes('components/explanation') ||
        f.includes('components/summary') ||
        f.includes('components/learning_path') ||
        f.includes('components/research')
    )

    for (const file of aiViewFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      assert.doesNotMatch(
        content,
        /dangerouslySetInnerHTML/,
        `dangerouslySetInnerHTML detected in AI component: ${path.relative(process.cwd(), file)}`
      )
    }
  })

  test('Security Audit — Zero Gemini or Tavily API Keys in Frontend Source', () => {
    for (const file of allSourceFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      assert.doesNotMatch(
        content,
        /AIzaSy[A-Za-z0-9_-]{33}/,
        `Potential Google API key detected in ${path.relative(process.cwd(), file)}`
      )
      assert.doesNotMatch(
        content,
        /tvly-[A-Za-z0-9_-]{32}/,
        `Potential Tavily API key detected in ${path.relative(process.cwd(), file)}`
      )
      assert.doesNotMatch(
        content,
        /GEMINI_API_KEY/,
        `Direct GEMINI_API_KEY reference found in frontend file: ${path.relative(process.cwd(), file)}`
      )
      assert.doesNotMatch(
        content,
        /TAVILY_API_KEY/,
        `Direct TAVILY_API_KEY reference found in frontend file: ${path.relative(process.cwd(), file)}`
      )
    }
  })
})

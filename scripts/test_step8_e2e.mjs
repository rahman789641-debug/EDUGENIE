import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep8E2ETests() {
  console.log('🚀 Starting STEP 8 — Quiz Generation Module Comprehensive E2E Verification...')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

  const consoleLogs = []
  const consoleErrors = []
  page.on('console', (msg) => {
    const text = msg.text()
    consoleLogs.push({ type: msg.type(), text })
    if (msg.type() === 'error') {
      consoleErrors.push(text)
    }
  })

  const results = []
  function record(testName, passed, details = '') {
    results.push({ testName, passed, details })
    const mark = passed ? '✅' : '❌'
    console.log(`${mark} [${testName}] ${details ? `(${details})` : ''}`)
  }

  try {
    // Inject test session before navigation so ProtectedRoute allows entry
    await page.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'test_student_marie_curie',
        email: 'marie.curie@edugenie.test',
        displayName: 'Marie Curie',
        getIdToken: async () => 'test_firebase_id_token_e2e_valid',
      }
    })

    // 1. PAGE NAVIGATION TEST
    await page.goto(`${BASE_URL}/quiz`, { waitUntil: 'networkidle0' })
    record('1. Quiz Page Loads', page.url().includes('/quiz'), `Current URL: ${page.url()}`)

    // 2. EMPTY STATE TEST
    const emptyStateEl = await page.$('[data-testid="quiz-empty-state"]')
    const emptyText = await page.evaluate(el => el ? el.innerText : '', emptyStateEl)
    const hasEmptyTitle = emptyText.includes('AI Quiz Generator')
    const hasEmptySubtitle = emptyText.includes('generate 3 targeted questions')
    record(
      '2. Empty State Content',
      Boolean(emptyStateEl && hasEmptyTitle && hasEmptySubtitle),
      'Rendered "AI Quiz Generator" and expected description'
    )

    // 3. SAMPLE PASSAGE SELECTION TEST
    const samplePill = await page.$('[data-testid="sample-pill-photosynthesis"]')
    record('3a. Sample Pills Present', Boolean(samplePill), 'Found Photosynthesis sample button')

    await samplePill.click()
    const inputValAfterClick = await page.$eval('[data-testid="quiz-content-input"]', el => el.value)
    const quizAreaBeforeSubmit = await page.$('[data-testid="quiz-active-area"]')
    record(
      '3b. Clicking Sample Populates Content Without Auto-Submit',
      inputValAfterClick.includes('Photosynthesis is the biological process') && quizAreaBeforeSubmit === null,
      `Text length: ${inputValAfterClick.length} chars, Active quiz area is null`
    )

    // 4. DIFFICULTY SELECTOR TEST
    const begBtn = await page.$('[data-testid="diff-btn-beginner"]')
    const intBtn = await page.$('[data-testid="diff-btn-intermediate"]')
    const advBtn = await page.$('[data-testid="diff-btn-advanced"]')

    const begAria = await page.evaluate(el => el.getAttribute('aria-checked'), begBtn)
    record('4a. Difficulty Default is Beginner', begAria === 'true', `Beginner aria-checked: ${begAria}`)

    await intBtn.click()
    const intAria = await page.evaluate(el => el.getAttribute('aria-checked'), intBtn)
    record('4b. Difficulty Switch to Intermediate', intAria === 'true', 'Switched to intermediate')

    await advBtn.click()
    const advAria = await page.evaluate(el => el.getAttribute('aria-checked'), advBtn)
    record('4c. Difficulty Switch to Advanced', advAria === 'true', 'Switched to advanced')

    // Reset back to beginner
    await begBtn.click()

    // 5. EMPTY CONTENT VALIDATION TEST
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="quiz-content-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      nativeSetter.call(input, '   ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnDisabledForWhitespace = await page.$eval('[data-testid="generate-quiz-btn"]', btn => btn.disabled)
    record(
      '5. Empty Content Validation Disables Generate Button',
      isBtnDisabledForWhitespace,
      'Generate Quiz button is disabled for whitespace'
    )

    // 6. VALID CONTENT ENABLES GENERATE BUTTON
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="quiz-content-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      nativeSetter.call(input, 'Photosynthesis occurs in chloroplasts and generates glucose and oxygen.')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnEnabled = await page.$eval('[data-testid="generate-quiz-btn"]', btn => !btn.disabled)
    record('6. Valid Content Enables Generate Button', isBtnEnabled, 'Button enabled for valid content')

    // Setup request interception for deterministic test cases
    await page.setRequestInterception(true)
    let interceptMode = 'success'
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().includes('/api/v1/quiz')) {
        if (interceptMode === 'loading_delay') {
          setTimeout(() => {
            interceptedRequest.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                title: 'Photosynthesis Quiz',
                difficulty: 'beginner',
                total_questions: 3,
                questions: [
                  {
                    id: 'q1',
                    question: 'Where does photosynthesis occur?',
                    options: ['Mitochondria', 'Chloroplasts', 'Ribosomes', 'Nucleus'],
                    correct_answer: 'Chloroplasts',
                    explanation: 'Chloroplasts contain chlorophyll and synthesize glucose.',
                  },
                  {
                    id: 'q2',
                    question: 'What gas is released as a byproduct?',
                    options: ['Nitrogen', 'Methane', 'Oxygen', 'Carbon Monoxide'],
                    correct_answer: 'Oxygen',
                    explanation: 'Water molecules split, releasing oxygen.',
                  },
                  {
                    id: 'q3',
                    question: 'What sugar is produced?',
                    options: ['Glucose', 'Lactose', 'Fructose', 'Maltose'],
                    correct_answer: 'Glucose',
                    explanation: 'Glucose stores chemical energy.',
                  },
                ],
                model: 'gemini-3.1-flash-lite',
                request_id: 'e2e-quiz-777',
              }),
            })
          }, 600)
          return
        }

        if (interceptMode === 'error_500') {
          interceptedRequest.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'AI_PROVIDER_ERROR',
                message: 'The AI service is momentarily unavailable. Please try again shortly.',
              },
            }),
          })
          return
        }

        // Standard success response
        interceptedRequest.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            title: 'Photosynthesis Quiz',
            difficulty: 'beginner',
            total_questions: 3,
            questions: [
              {
                id: 'q1',
                question: 'Where does photosynthesis occur?',
                options: ['Mitochondria', 'Chloroplasts', 'Ribosomes', 'Nucleus'],
                correct_answer: 'Chloroplasts',
                explanation: 'Chloroplasts contain chlorophyll and synthesize glucose.',
              },
              {
                id: 'q2',
                question: 'What gas is released as a byproduct?',
                options: ['Nitrogen', 'Methane', 'Oxygen', 'Carbon Monoxide'],
                correct_answer: 'Oxygen',
                explanation: 'Water molecules split, releasing oxygen.',
              },
              {
                id: 'q3',
                question: 'What sugar is produced?',
                options: ['Glucose', 'Lactose', 'Fructose', 'Maltose'],
                correct_answer: 'Glucose',
                explanation: 'Glucose stores chemical energy.',
              },
            ],
            model: 'gemini-3.1-flash-lite',
            request_id: 'e2e-quiz-777',
          }),
        })
      } else {
        interceptedRequest.continue()
      }
    })

    // 7. LOADING STATE TEST
    interceptMode = 'loading_delay'
    await page.click('[data-testid="generate-quiz-btn"]')
    await page.waitForSelector('[data-testid="quiz-loading-state"]', { timeout: 3000 })
    const loadingText = await page.$eval('[data-testid="quiz-loading-state"]', el => el.innerText)
    record(
      '7. Loading State Displayed',
      loadingText.includes('EduGenie is generating your quiz...'),
      `Loading text: "${loadingText.trim().replace(/\n/g, ' ')}"`
    )

    // 8. ACTIVE QUIZ AREA & QUESTIONS RENDERED
    await page.waitForSelector('[data-testid="quiz-active-area"]', { timeout: 5000 })
    const questionCards = await page.$$('.quiz-question-card')
    record(
      '8. Exactly 3 Question Cards Rendered',
      questionCards.length === 3,
      `Found ${questionCards.length} question cards`
    )

    // Verify 4 options for each question
    const q1Options = await page.$$('[data-testid^="option-btn-1-"]')
    const q2Options = await page.$$('[data-testid^="option-btn-2-"]')
    const q3Options = await page.$$('[data-testid^="option-btn-3-"]')
    record(
      '8b. Exactly 4 Options Per Question',
      q1Options.length === 4 && q2Options.length === 4 && q3Options.length === 4,
      `Q1: ${q1Options.length}, Q2: ${q2Options.length}, Q3: ${q3Options.length}`
    )

    // 9. INTERACTIVE OPTION SELECTION
    // Q1: Choose Chloroplasts (Option 2) -> Correct
    await page.click('[data-testid="option-btn-1-2"]')
    // Q2: Choose Nitrogen (Option 1) -> Wrong (Correct is Oxygen)
    await page.click('[data-testid="option-btn-2-1"]')
    // Q3: Choose Glucose (Option 1) -> Correct
    await page.click('[data-testid="option-btn-3-1"]')

    const submitBtn = await page.$('[data-testid="submit-quiz-answers-btn"]')
    const isSubmitEnabled = await page.evaluate(el => !el.disabled, submitBtn)
    record('9. Option Selection & Submit Button Enabled', isSubmitEnabled, 'All 3 answered; submit enabled')

    // 10. SUBMISSION & SCORING TEST
    await submitBtn.click()
    await page.waitForSelector('[data-testid="quiz-score-banner"]', { timeout: 3000 })
    const scoreText = await page.$eval('[data-testid="quiz-score-banner"]', el => el.innerText)
    const isScoreCorrect = scoreText.includes('2 / 3 (67%)')
    record(
      '10a. Quiz Scoring Calculation',
      isScoreCorrect,
      `Score banner: "${scoreText.trim().replace(/\n/g, ' ')}"`
    )

    // Verify correct/incorrect badges and explanations
    const explanationBoxes = await page.$$('.quiz-explanation-box')
    record(
      '10b. Educational Explanations Rendered After Submission',
      explanationBoxes.length === 3,
      `Rendered ${explanationBoxes.length} explanation boxes`
    )

    // 11. RETAKE QUIZ ACTION
    await page.click('[data-testid="retake-quiz-btn"]')
    const scoreBannerAfterRetake = await page.$('[data-testid="quiz-score-banner"]')
    record(
      '11. Retake Action Clears Selections & Resets Form',
      scoreBannerAfterRetake === null,
      'Score banner dismissed, ready for re-attempt'
    )

    // 12. ERROR STATE TEST
    interceptMode = 'error_500'
    await page.click('button[type="button"][class="chat-code-copy-btn"]') // Create New Quiz
    await page.waitForSelector('[data-testid="quiz-content-input"]', { timeout: 3000 })
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="quiz-content-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      nativeSetter.call(input, 'New study content about physics and motion.')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.click('[data-testid="generate-quiz-btn"]')

    await page.waitForSelector('[data-testid="quiz-error-banner"]', { timeout: 3000 })
    const errorBannerText = await page.$eval('[data-testid="quiz-error-banner"]', el => el.innerText)
    record(
      '12. Error State Banner Displayed',
      errorBannerText.includes('momentarily unavailable') && errorBannerText.includes('Retry'),
      `Error text: "${errorBannerText.trim()}"`
    )

    // 13. MOBILE 375px LAYOUT TEST
    await page.setViewport({ width: 375, height: 667 })
    await page.waitForFunction(() => window.innerWidth === 375)
    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record(
      '13. Mobile 375px Responsive Layout',
      !hasHorizontalScrollbar,
      `Viewport: 375px, Overflow width: ${hasHorizontalScrollbar ? 'FAIL' : 'PASS (0px)'}`
    )

    // 14. BROWSER CONSOLE ERROR AUDIT
    const realErrors = consoleErrors.filter(
      err => !err.includes('net::ERR_') && !err.includes('Failed to load resource')
    )
    record(
      '14. Browser Console Zero Uncaught Runtime Errors',
      realErrors.length === 0,
      realErrors.length === 0 ? '0 uncaught exceptions' : `Errors: ${realErrors.join('; ')}`
    )

  } catch (err) {
    console.error('❌ E2E Execution caught unexpected error:', err)
    record('E2E Run Completion', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n==================================================')
  console.log('STEP 8 BROWSER E2E TEST SUMMARY:')
  const passedCount = results.filter(r => r.passed).length
  console.log(`Passed: ${passedCount} / ${results.length} (${Math.round((passedCount / results.length) * 100)}%)`)
  console.log('==================================================')

  if (passedCount < results.length) {
    process.exit(1)
  }
}

runStep8E2ETests().catch(err => {
  console.error('Fatal in test runner:', err)
  process.exit(1)
})

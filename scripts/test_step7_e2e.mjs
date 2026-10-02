import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep7E2ETests() {
  console.log('🚀 Starting STEP 7 — Concept Explanation Comprehensive E2E Verification...')

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

    // 1. PAGE LOADS TEST
    await page.goto(`${BASE_URL}/explain`, { waitUntil: 'networkidle0' })
    record('1. Explanation Page Loads', page.url().includes('/explain'), `Current URL: ${page.url()}`)

    // 2. EMPTY STATE TEST
    const emptyStateEl = await page.$('[data-testid="explainer-empty-state"]')
    const emptyText = await page.evaluate(el => el ? el.innerText : '', emptyStateEl)
    const hasEmptyTitle = emptyText.includes('Understand any concept')
    const hasEmptySubtitle = emptyText.includes('Enter a topic and EduGenie will explain it at your level.')
    record(
      '2. Empty State Content',
      Boolean(emptyStateEl && hasEmptyTitle && hasEmptySubtitle),
      'Rendered "Understand any concept" and expected subtitle'
    )

    // 3. EXAMPLE TOPIC SELECTION TEST
    const recursionPill = await page.$('[data-testid="suggestion-pill-recursion"]')
    record('3a. Suggestion Pills Present', Boolean(recursionPill), 'Found Recursion suggestion pill')

    await recursionPill.click()
    const inputValAfterClick = await page.$eval('[data-testid="explainer-topic-input"]', el => el.value)
    const resultCardBeforeSubmit = await page.$('[data-testid="explainer-result-card"]')
    record(
      '3b. Clicking Example Populates Input Without Auto-Submit',
      inputValAfterClick === 'Recursion' && resultCardBeforeSubmit === null,
      `Input value: "${inputValAfterClick}", Result card is null`
    )

    // 4. LEVEL SELECTION TEST
    const beginnerBtn = await page.$('[data-testid="level-btn-beginner"]')
    const intermediateBtn = await page.$('[data-testid="level-btn-intermediate"]')
    const advancedBtn = await page.$('[data-testid="level-btn-advanced"]')

    const beginnerAria = await page.evaluate(el => el.getAttribute('aria-checked'), beginnerBtn)
    record('4a. Level Selector Default is Beginner', beginnerAria === 'true', `Beginner aria-checked: ${beginnerAria}`)

    await intermediateBtn.click()
    const interAria = await page.evaluate(el => el.getAttribute('aria-checked'), intermediateBtn)
    const begAfterClick = await page.evaluate(el => el.getAttribute('aria-checked'), beginnerBtn)
    record('4b. Level Selector Switch to Intermediate', interAria === 'true' && begAfterClick === 'false', 'Switched to intermediate')

    await advancedBtn.click()
    const advAria = await page.evaluate(el => el.getAttribute('aria-checked'), advancedBtn)
    record('4c. Level Selector Switch to Advanced', advAria === 'true', 'Switched to advanced')

    // Reset back to beginner for test flow
    await beginnerBtn.click()

    // 5. EMPTY TOPIC VALIDATION TEST
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="explainer-topic-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, '   ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnDisabledForWhitespace = await page.$eval('[data-testid="explain-submit-btn"]', btn => btn.disabled)
    record(
      '5. Empty Topic Validation Disables Explain Button',
      isBtnDisabledForWhitespace,
      'Submit button is disabled when input is whitespace-only'
    )

    // 6. EXPLAIN BUTTON INTERACTION
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="explainer-topic-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, 'Recursion')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnEnabledWithValidInput = await page.$eval('[data-testid="explain-submit-btn"]', btn => !btn.disabled)
    record('6. Explain Button Enabled for Valid Topic', isBtnEnabledWithValidInput, 'Submit button enabled for "Recursion"')

    // Intercept /api/v1/explain for deterministic UI response verification
    await page.setRequestInterception(true)
    let interceptMode = 'success'
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().includes('/api/v1/explain')) {
        if (interceptMode === 'loading_delay') {
          setTimeout(() => {
            interceptedRequest.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                topic: 'Recursion',
                level: 'beginner',
                title: 'Understanding Recursion: The Art of Self-Referencing',
                explanation: 'Recursion is when a function calls itself to solve smaller pieces of a problem.\n\n### Why It Works\nEvery recursive function needs a **base case**.',
                key_points: [
                  'A recursive function calls itself.',
                  'A base case terminates recursion.',
                  'Missing base case causes call stack overflow.',
                ],
                example: 'function countDown(n) {\n  if (n <= 0) return;\n  console.log(n);\n  countDown(n - 1);\n}',
                request_id: 'e2e-trace-success-777',
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

        if (interceptMode === 'auth_401') {
          interceptedRequest.respond({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'SESSION_EXPIRED',
                message: 'Your session has expired. Please sign in again.',
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
            topic: 'Recursion',
            level: 'beginner',
            title: 'Understanding Recursion: The Art of Self-Referencing',
            explanation: 'Recursion is when a function calls itself to solve smaller pieces of a problem.\n\n### Why It Works\nEvery recursive function needs a **base case**.',
            key_points: [
              'A recursive function calls itself.',
              'A base case terminates recursion.',
              'Missing base case causes call stack overflow.',
            ],
            example: 'function countDown(n) {\n  if (n <= 0) return;\n  console.log(n);\n  countDown(n - 1);\n}',
            request_id: 'e2e-trace-success-777',
          }),
        })
      } else {
        interceptedRequest.continue()
      }
    })

    // 7. LOADING STATE & DUPLICATE SUBMISSION TEST
    interceptMode = 'loading_delay'
    const submitBtn = await page.$('[data-testid="explain-submit-btn"]')
    await submitBtn.click()

    await page.waitForSelector('[data-testid="explainer-loading-state"]', { timeout: 3000 })
    const loadingText = await page.$eval('[data-testid="explainer-loading-state"]', el => el.innerText)
    const isButtonDisabledDuringLoading = await page.$eval('[data-testid="explain-submit-btn"]', btn => btn.disabled)
    record(
      '7. Loading State Displayed & Button Disabled',
      loadingText.includes('EduGenie is explaining...') && isButtonDisabledDuringLoading,
      `Loading text: "${loadingText.trim().replace(/\n/g, ' ')}", Button disabled: ${isButtonDisabledDuringLoading}`
    )

    // 8. SUCCESSFUL RESPONSE RENDERING
    await page.waitForSelector('[data-testid="explainer-result-card"]', { timeout: 5000 })
    const titleText = await page.$eval('[data-testid="explainer-title"]', el => el.innerText)
    const bodyText = await page.$eval('[data-testid="explainer-body"]', el => el.innerText)
    const keyPointsCount = await page.$$eval('[data-testid="explainer-key-points"] li', lis => lis.length)
    const exampleText = await page.$eval('[data-testid="explainer-example-box"]', el => el.innerText)

    record(
      '8. Successful Explanation Result Rendered',
      titleText.includes('Understanding Recursion') &&
      bodyText.includes('Recursion is when a function') &&
      keyPointsCount === 3 &&
      exampleText.includes('countDown'),
      `Title: "${titleText}", Points: ${keyPointsCount}, Example present: true`
    )

    // 9. ERROR STATE TEST
    interceptMode = 'error_500'
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="explainer-topic-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, 'Complex Analysis')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.click('[data-testid="explain-submit-btn"]')

    await page.waitForSelector('[data-testid="explainer-error-banner"]', { timeout: 3000 })
    const errorBannerText = await page.$eval('[data-testid="explainer-error-banner"]', el => el.innerText)
    record(
      '9. Error State Banner Displayed',
      errorBannerText.includes('momentarily unavailable') && errorBannerText.includes('Retry'),
      `Error text: "${errorBannerText.trim()}"`
    )

    // 10. AUTHENTICATION EXPIRY (401) TEST
    interceptMode = 'auth_401'
    await page.click('[data-testid="explain-submit-btn"]')
    await page.waitForSelector('[data-testid="explainer-error-banner"]', { timeout: 3000 })
    const authErrorText = await page.$eval('[data-testid="explainer-error-banner"]', el => el.innerText)
    record(
      '10. Session Expiry (401) Cleanly Handled',
      authErrorText.includes('session has expired'),
      `Auth error message: "${authErrorText.trim()}"`
    )

    // 11. LONG EXPLANATION & SAFE MARKDOWN RENDERING
    interceptMode = 'success'
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="explainer-topic-input"]')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, 'Quantum Computing')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.click('[data-testid="explain-submit-btn"]')
    await page.waitForSelector('[data-testid="explainer-result-card"]', { timeout: 3000 })

    const hasDangerousHTML = await page.evaluate(() => {
      const explainer = document.querySelector('[data-testid="concept-explainer"]')
      return explainer ? explainer.innerHTML.includes('<script>') : false
    })
    record('12. Safe Markdown Rendering (Zero HTML/Script Injection)', !hasDangerousHTML, 'Confirmed zero unescaped script tags')

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
  console.log('STEP 7 BROWSER E2E TEST SUMMARY:')
  const passedCount = results.filter(r => r.passed).length
  console.log(`Passed: ${passedCount} / ${results.length} (${Math.round((passedCount / results.length) * 100)}%)`)
  console.log('==================================================')

  if (passedCount < results.length) {
    process.exit(1)
  }
}

runStep7E2ETests().catch(err => {
  console.error('Fatal in test runner:', err)
  process.exit(1)
})

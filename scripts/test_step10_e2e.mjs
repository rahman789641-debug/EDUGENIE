import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep10E2ETests() {
  console.log('🚀 Starting STEP 10 — Personalized Learning Path Module Comprehensive E2E Verification...')

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
        uid: 'test_student_ada_lovelace',
        email: 'ada@edugenie.test',
        displayName: 'Ada Lovelace',
        getIdToken: async () => 'test_firebase_id_token_step10_valid',
      }
    })

    // 1. PAGE NAVIGATION TEST
    await page.goto(`${BASE_URL}/learn`, { waitUntil: 'networkidle0' })
    record('1. Learning Path Page Loads', page.url().includes('/learn'), `Current URL: ${page.url()}`)

    // 2. HEADER & CONTAINER VERIFICATION
    const headingText = await page.$eval('h2', el => el.innerText)
    const lpContainer = await page.$('[data-testid="personalized-learning-path"]')
    record(
      '2. Header & Personalized Learning Path Container Rendered',
      headingText.includes('Personalized Learning Pathways') && Boolean(lpContainer),
      `Heading: "${headingText}"`
    )

    // 3. EMPTY STATE & 6 SAMPLE PILLS
    const emptyBanner = await page.$('[data-testid="learning-path-empty-state"]')
    const samplePills = await page.$$('.learning-path-example-pill')
    record(
      '3. Empty State Guidance & 6 Example Topics Rendered',
      Boolean(emptyBanner) && samplePills.length === 6,
      `Found ${samplePills.length} sample pills`
    )

    // 4. SAMPLE SELECTION (NO AUTO-SUBMIT)
    await samplePills[0].click() // Click Python
    const inputValAfterSample = await page.$eval('#topic-input', el => el.value)
    const resultBeforeSubmit = await page.$('[data-testid="learning-path-result"]')
    record(
      '4. Sample Selection Populates Topic Input Without Auto-Submit',
      inputValAfterSample === 'Python' && resultBeforeSubmit === null,
      `Topic value: "${inputValAfterSample}", Result area is null: ${resultBeforeSubmit === null}`
    )

    // 5. LEVEL SELECTOR RADIOGROUP
    const begBtn = await page.$('#level-btn-beginner')
    const intBtn = await page.$('#level-btn-intermediate')
    const advBtn = await page.$('#level-btn-advanced')

    const defaultBegAria = await page.evaluate(el => el.getAttribute('aria-checked'), begBtn)
    record('5a. Level Selector Defaults to Beginner', defaultBegAria === 'true', `Beginner aria-checked: ${defaultBegAria}`)

    await intBtn.click()
    const intAria = await page.evaluate(el => el.getAttribute('aria-checked'), intBtn)
    record('5b. Level Switched to Intermediate', intAria === 'true', `Intermediate aria-checked: ${intAria}`)

    await advBtn.click()
    const advAria = await page.evaluate(el => el.getAttribute('aria-checked'), advBtn)
    record('5c. Level Switched to Advanced', advAria === 'true', `Advanced aria-checked: ${advAria}`)

    // Switch back to beginner for standard test
    await begBtn.click()

    // 6. GOAL INPUT
    await page.type('#learning-goal-input', 'Become a backend developer')
    const goalVal = await page.$eval('#learning-goal-input', el => el.value)
    record('6. Goal Input Filled', goalVal === 'Become a backend developer', `Goal value: "${goalVal}"`)

    // 7. EMPTY / WHITESPACE VALIDATION
    await page.evaluate(() => {
      const input = document.getElementById('topic-input')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, '    ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnDisabledForWhitespace = await page.$eval('#btn-generate-path', btn => btn.disabled)
    record(
      '7. Generate Button Disabled for Pure Whitespace Topic',
      isBtnDisabledForWhitespace === true,
      `Button disabled: ${isBtnDisabledForWhitespace}`
    )

    // Re-populate with valid topic
    await page.evaluate(() => {
      const input = document.getElementById('topic-input')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, 'Python Programming')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    // 8. SETUP NETWORK INTERCEPTION
    await page.setRequestInterception(true)
    let interceptMode = 'success'

    page.on('request', (interceptedRequest) => {
      const url = interceptedRequest.url()
      if (url.includes('/api/v1/learn/recommendations')) {
        if (interceptMode === 'loading_delay') {
          setTimeout(() => {
            interceptedRequest.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'ok',
                topic: 'Python Programming',
                level: 'beginner',
                goal: 'Become a backend developer',
                overview: 'This personalized curriculum transitions you from fundamental Python logic to professional backend engineering using modern web frameworks, SQL databases, and asynchronous programming.',
                stages: [
                  {
                    stage: 1,
                    title: 'Foundations of Python & Procedural Logic',
                    difficulty: 'beginner',
                    concepts: ['Variables & primitives', 'Functions & modular scope', 'Data structures (Lists, Dicts)'],
                    practice: ['Build a CLI-based task manager', 'Complete 10 algorithmic logic challenges'],
                    resources: [
                      { type: 'documentation', title: 'Official Python Tutorial', url: null },
                      { type: 'book', title: 'Python Crash Course', url: null },
                    ],
                  },
                  {
                    stage: 2,
                    title: 'Web APIs & Asynchronous Architecture',
                    difficulty: 'intermediate',
                    concepts: ['HTTP protocol & REST conventions', 'FastAPI & Pydantic validation', 'Asynchronous endpoints'],
                    practice: ['Build a RESTful CRUD microservice', 'Write automated pytest test suites'],
                    resources: [
                      { type: 'documentation', title: 'FastAPI User Guide', url: null },
                    ],
                  },
                ],
                total_stages: 2,
                next_steps: [
                  'Deploy application to cloud container runtime (Docker)',
                  'Learn SQL query optimization and connection pooling',
                ],
                request_id: 'e2e-lp-777',
                model: 'gemini-3.1-flash-lite',
              }),
            })
          }, 600)
          return
        }

        if (interceptMode === 'rate_limited') {
          interceptedRequest.respond({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'AI_RATE_LIMITED',
                message: 'EduGenie is currently receiving high demand. Please wait a moment and try again.',
              },
            }),
          })
          return
        }

        if (interceptMode === 'timeout') {
          interceptedRequest.respond({
            status: 504,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'AI_TIMEOUT',
                message: 'Learning path generation took longer than expected. Please try again.',
              },
            }),
          })
          return
        }

        // Standard success
        interceptedRequest.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            topic: 'Python Programming',
            level: 'beginner',
            goal: 'Become a backend developer',
            overview: 'This personalized curriculum transitions you from fundamental Python logic to professional backend engineering using modern web frameworks, SQL databases, and asynchronous programming.',
            stages: [
              {
                stage: 1,
                title: 'Foundations of Python & Procedural Logic',
                difficulty: 'beginner',
                concepts: ['Variables & primitives', 'Functions & modular scope', 'Data structures (Lists, Dicts)'],
                practice: ['Build a CLI-based task manager', 'Complete 10 algorithmic logic challenges'],
                resources: [
                  { type: 'documentation', title: 'Official Python Tutorial', url: null },
                  { type: 'book', title: 'Python Crash Course', url: null },
                ],
              },
              {
                stage: 2,
                title: 'Web APIs & Asynchronous Architecture',
                difficulty: 'intermediate',
                concepts: ['HTTP protocol & REST conventions', 'FastAPI & Pydantic validation', 'Asynchronous endpoints'],
                practice: ['Build a RESTful CRUD microservice', 'Write automated pytest test suites'],
                resources: [
                  { type: 'documentation', title: 'FastAPI User Guide', url: null },
                ],
              },
            ],
            total_stages: 2,
            next_steps: [
              'Deploy application to cloud container runtime (Docker)',
              'Learn SQL query optimization and connection pooling',
            ],
            request_id: 'e2e-lp-888',
            model: 'gemini-3.1-flash-lite',
          }),
        })
      } else {
        interceptedRequest.continue()
      }
    })

    // 9. LOADING STATE TEST
    interceptMode = 'loading_delay'
    await page.click('#btn-generate-path')
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-generate-path')
      return btn && btn.innerText.includes('Creating your personalized learning path...') && btn.disabled
    }, { timeout: 3000 })
    record('9. Loading State Displays Spinner & Disabled Button', true, 'Detected loading state and duplicate submission guard')

    // 10. RESULT CARD & TIMELINE RENDERING
    await page.waitForSelector('[data-testid="learning-path-result"]', { timeout: 5000 })
    const topicRendered = await page.$eval('.learning-path-topic-name', el => el.innerText)
    const overviewRendered = await page.$eval('[data-testid="learning-path-overview"]', el => el.innerText)
    const stageCards = await page.$$('.learning-path-stage-card')

    record(
      '10a. Result Header & Overview Rendered',
      topicRendered.includes('Python Programming') && overviewRendered.includes('personalized curriculum'),
      `Topic: "${topicRendered}", Overview: "${overviewRendered.slice(0, 60)}..."`
    )
    record(
      '10b. Stages Rendered on Timeline',
      stageCards.length === 2,
      `Rendered ${stageCards.length} stage cards`
    )

    // Check Stage 1 contents: Concepts, Practice, Resources
    const s1Concepts = await page.$$eval('[data-testid="stage-concepts-1"] li', lis => lis.map(li => li.innerText))
    const s1Practice = await page.$$eval('[data-testid="stage-practice-1"] li', lis => lis.map(li => li.innerText))
    const s1Resources = await page.$$eval('[data-testid="stage-resources-1"] .learning-path-resource-row', rows => rows.map(r => r.innerText))

    record(
      '10c. Stage 1 Concepts, Practice, and Resources Rendered',
      s1Concepts.length === 3 && s1Practice.length === 2 && s1Resources.length === 2,
      `Concepts: ${s1Concepts.length}, Practice: ${s1Practice.length}, Resources: ${s1Resources.length}`
    )

    // Check anti-fake-URL: confirm resources are NOT clickable anchor links
    const resourceLinks = await page.$$('[data-testid="stage-resources-1"] a')
    record(
      '10d. Anti-Fake-URL: Unverified Resources Rendered as Safe Text (0 links)',
      resourceLinks.length === 0,
      `Found ${resourceLinks.length} clickable links (expected 0)`
    )

    // 11. NEXT STEPS RENDERING
    const nextSteps = await page.$$eval('[data-testid="learning-path-next-steps"] li', lis => lis.map(li => li.innerText))
    record(
      '11. Next Steps & Advanced Specialization Rendered',
      nextSteps.length === 2 && nextSteps[0].includes('Docker'),
      `Rendered ${nextSteps.length} next steps`
    )

    // 12. COPY LEARNING PATH ACTION
    await page.click('#btn-copy-path')
    await page.waitForFunction(() => {
      const feedback = document.querySelector('.learning-path-copy-feedback')
      return feedback && feedback.innerText.includes('Copied to clipboard!')
    }, { timeout: 2000 })
    record('12. Copy Learning Path Provides "Copied to clipboard!" Feedback', true, 'Copy feedback confirmed')

    // 13. CLEAR ACTION
    await page.click('#btn-clear-path')
    const inputAfterClear = await page.$eval('#topic-input', el => el.value)
    const resultAfterClear = await page.$('[data-testid="learning-path-result"]')
    record(
      '13. Clear Action Empties Input and Clears Result Card',
      inputAfterClear === '' && resultAfterClear === null,
      `Input empty: ${inputAfterClear === ''}, Result card null: ${resultAfterClear === null}`
    )

    // 14. ERROR HANDLING: RATE LIMIT (429)
    await samplePills[1].click() // Select Java
    interceptMode = 'rate_limited'
    await page.click('#btn-generate-path')
    await page.waitForSelector('.ui-alert-danger', { timeout: 3000 })
    const rateLimitErrorText = await page.$eval('.ui-alert-danger', el => el.innerText)
    record(
      '14. Rate Limit (429) Displays Friendly Alert',
      rateLimitErrorText.includes('high demand'),
      `Error text: "${rateLimitErrorText.trim()}"`
    )

    // Dismiss alert
    await page.click('.ui-alert-danger button')
    const errorDismissed = await page.$('.ui-alert-danger')
    record('14b. Error Alert Dismissed via ✕ Button', errorDismissed === null, 'Alert closed')

    // 15. ERROR HANDLING: TIMEOUT (504)
    interceptMode = 'timeout'
    await page.click('#btn-generate-path')
    await page.waitForSelector('.ui-alert-danger', { timeout: 3000 })
    const timeoutErrorText = await page.$eval('.ui-alert-danger', el => el.innerText)
    record(
      '15. Timeout (504) Displays Friendly Suggestion',
      timeoutErrorText.includes('longer than expected'),
      `Timeout text: "${timeoutErrorText.trim()}"`
    )

    // 16. TOGGLE BETWEEN LEARNING PATH & TEXTBOOK LAB
    await page.click('#tab-workspace-mode')
    await page.waitForSelector('.task-selector-list', { timeout: 3000 })
    const inWorkspace = await page.$('.task-selector-list')
    record('16a. Switch to Textbook Lab Workspace', Boolean(inWorkspace), 'AIAssistantWorkspace mounted')

    await page.click('#tab-path-mode')
    await page.waitForSelector('[data-testid="personalized-learning-path"]', { timeout: 3000 })
    const inPath = await page.$('[data-testid="personalized-learning-path"]')
    record('16b. Switch Back to Personalized Learning Path', Boolean(inPath), 'PersonalizedLearningPath re-mounted')

    // 17. RESPONSIVENESS (MOBILE 375px & TABLET 768px)
    await page.setViewport({ width: 375, height: 667 })
    const hasHorizontalScrollMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record('17a. Responsive on Mobile (375px)', !hasHorizontalScrollMobile, `Horizontal scroll: ${hasHorizontalScrollMobile}`)

    await page.setViewport({ width: 768, height: 1024 })
    const hasHorizontalScrollTablet = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record('17b. Responsive on Tablet (768px)', !hasHorizontalScrollTablet, `Horizontal scroll: ${hasHorizontalScrollTablet}`)

    // 18. CLIENT-SIDE SECURITY AUDIT
    const securityCheck = await page.evaluate(() => {
      const html = document.documentElement.innerHTML
      return {
        hasGeminiKeyInDom: html.includes('AIzaSy'),
        hasGeminiKeyInWindow: typeof window.GEMINI_API_KEY !== 'undefined',
      }
    })
    record(
      '18. Client-Side Security: Zero Secret Leakage in DOM or Window',
      !securityCheck.hasGeminiKeyInDom && !securityCheck.hasGeminiKeyInWindow,
      `DOM clean: ${!securityCheck.hasGeminiKeyInDom}, Window clean: ${!securityCheck.hasGeminiKeyInWindow}`
    )

  } catch (err) {
    console.error('❌ E2E Test execution failed with error:', err)
    record('Fatal Execution Error', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n===========================================================================')
  console.log('STEP 10 E2E LEARNING PATH VERIFICATION RESULTS:')
  console.log('===========================================================================')
  const total = results.length
  const passed = results.filter(r => r.passed).length
  const failed = total - passed

  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.testName}: ${r.details}`)
  }

  console.log('===========================================================================')
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('===========================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runStep10E2ETests().catch(err => {
  console.error('Fatal crash:', err)
  process.exit(1)
})

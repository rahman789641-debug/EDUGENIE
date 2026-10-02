import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep9E2ETests() {
  console.log('🚀 Starting STEP 9 — Educational Summarization Module Comprehensive E2E Verification...')

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
        uid: 'test_student_richard_feynman',
        email: 'feynman@edugenie.test',
        displayName: 'Richard Feynman',
        getIdToken: async () => 'test_firebase_id_token_step9_valid',
      }
    })

    // 1. PAGE NAVIGATION TEST
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'networkidle0' })
    record('1. Summary Page Loads', page.url().includes('/summary'), `Current URL: ${page.url()}`)

    // 2. HEADER & CONTAINER VERIFICATION
    const headingText = await page.$eval('h2', el => el.innerText)
    const summarizerContainer = await page.$('[data-testid="educational-summarizer"]')
    record(
      '2. Header & Summarizer Container Rendered',
      headingText.includes('Text & Lecture Summarization') && Boolean(summarizerContainer),
      `Heading: "${headingText}"`
    )

    // 3. EMPTY STATE & SAMPLE PILLS
    const samplePills = await page.$$('.summarizer-example-pill')
    const charCountEl = await page.$eval('.summarizer-char-count', el => el.innerText)
    record(
      '3. Empty State with 4 Sample Topics & 0 Char Count',
      samplePills.length === 4 && charCountEl.includes('0 / 50,000'),
      `Pills count: ${samplePills.length}, Char count: "${charCountEl}"`
    )

    // 4. SAMPLE SELECTION (NO AUTO-SUBMIT)
    await samplePills[0].click() // Click Photosynthesis
    const inputValAfterSample = await page.$eval('#summary-content-input', el => el.value)
    const resultBeforeSubmit = await page.$('[data-testid="summarizer-result"]')
    record(
      '4. Sample Selection Populates Input Without Auto-Submit',
      inputValAfterSample.includes('Photosynthesis is the fundamental biological process') && resultBeforeSubmit === null,
      `Text length: ${inputValAfterSample.length} chars, Result area is null`
    )

    // 5. LENGTH SELECTOR RADIOGROUP
    const shortBtn = await page.$('#length-btn-short')
    const medBtn = await page.$('#length-btn-medium')
    const detBtn = await page.$('#length-btn-detailed')

    const defaultMedAria = await page.evaluate(el => el.getAttribute('aria-checked'), medBtn)
    record('5a. Length Selector Defaults to Medium', defaultMedAria === 'true', `Medium aria-checked: ${defaultMedAria}`)

    await shortBtn.click()
    const shortAria = await page.evaluate(el => el.getAttribute('aria-checked'), shortBtn)
    record('5b. Length Switched to Short', shortAria === 'true', `Short aria-checked: ${shortAria}`)

    await detBtn.click()
    const detAria = await page.evaluate(el => el.getAttribute('aria-checked'), detBtn)
    record('5c. Length Switched to Detailed', detAria === 'true', `Detailed aria-checked: ${detAria}`)

    // Switch back to medium for standard test
    await medBtn.click()

    // 6. WHITESPACE & EMPTY VALIDATION
    await page.evaluate(() => {
      const input = document.getElementById('summary-content-input')
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      nativeSetter.call(input, '    ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const isBtnDisabledForWhitespace = await page.$eval('#btn-summarize', btn => btn.disabled)
    record(
      '6. Summarize Button Disabled for Pure Whitespace',
      isBtnDisabledForWhitespace === true,
      `Button disabled: ${isBtnDisabledForWhitespace}`
    )

    // Re-populate with valid sample
    await samplePills[0].click()

    // 7. SETUP NETWORK INTERCEPTION FOR DETERMINISTIC UI BEHAVIOR TESTS
    await page.setRequestInterception(true)
    let interceptMode = 'success'

    page.on('request', (interceptedRequest) => {
      const url = interceptedRequest.url()
      if (url.includes('/api/v1/summarize')) {
        if (interceptMode === 'loading_delay') {
          setTimeout(() => {
            interceptedRequest.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'ok',
                length: 'medium',
                summary: 'Photosynthesis is the biological process converting light into chemical energy stored in glucose within plant chloroplasts. It produces oxygen from water photolysis and fixes CO2 during the Calvin cycle.',
                key_points: [
                  'Converts solar energy into carbohydrates',
                  'Light reactions occur in thylakoids yielding ATP and NADPH',
                  'Dark reactions fix carbon dioxide in stroma',
                  'Releases molecular oxygen into the atmosphere',
                ],
                original_length_chars: 720,
                summary_length_chars: 215,
                request_id: 'e2e-sum-777',
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
                message: 'Summarization took longer than expected. Please try again.',
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
            length: 'medium',
            summary: 'Photosynthesis is the fundamental biological process through which green plants, algae, and cyanobacteria convert light energy into chemical energy stored in glucose. During the light-dependent reactions within thylakoid membranes, absorbed photons drive water photolysis, releasing oxygen. In the Calvin cycle, ATP and NADPH fix carbon dioxide into carbohydrates.',
            key_points: [
              'Converts sunlight into stable carbohydrate chemical energy',
              'Photolysis of water releases vital oxygen gas',
              'Calvin cycle in the stroma fixes carbon dioxide into G3P',
              'Forms the primary energetic basis for terrestrial ecosystems',
            ],
            original_length_chars: 720,
            summary_length_chars: 375,
            request_id: 'e2e-sum-888',
            model: 'gemini-3.1-flash-lite',
          }),
        })
      } else {
        interceptedRequest.continue()
      }
    })

    // 8. LOADING STATE TEST
    interceptMode = 'loading_delay'
    await page.click('#btn-summarize')
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-summarize')
      return btn && btn.innerText.includes('EduGenie is summarizing...') && btn.disabled
    }, { timeout: 3000 })
    record('8. Loading State with "EduGenie is summarizing..." and Disabled Button', true, 'Detected loading spinner and label')

    // 9. RESULT CARD & SAFE CONTENT RENDERING
    await page.waitForSelector('[data-testid="summarizer-result"]', { timeout: 5000 })
    const summaryText = await page.$eval('[data-testid="summary-content"]', el => el.innerText)
    const keyPoints = await page.$$eval('[data-testid="summary-key-points"] li', lis => lis.map(li => li.innerText))
    const lengthBadge = await page.$eval('.summarizer-badge', el => el.innerText)

    record(
      '9a. Summary Content Rendered via Safe Markdown',
      summaryText.includes('Photosynthesis is the biological process') && summaryText.length > 50,
      `Summary length: ${summaryText.length} chars`
    )
    record(
      '9b. Key Revision Points Rendered',
      keyPoints.length === 4 && keyPoints[0].includes('energy'),
      `Rendered ${keyPoints.length} key points`
    )
    record(
      '9c. Length Badge Displays Correct Tier',
      lengthBadge.toLowerCase().includes('medium'),
      `Badge text: "${lengthBadge}"`
    )

    // 10. COPY SUMMARY BUTTON
    await page.click('#btn-copy-summary')
    await page.waitForFunction(() => {
      const feedback = document.querySelector('.summarizer-copy-feedback')
      return feedback && feedback.innerText.includes('Copied to clipboard!')
    }, { timeout: 2000 })
    record('10. Copy Summary Provides Feedback "Copied to clipboard!"', true, 'Copy feedback confirmed')

    // 11. CLEAR ACTION
    await page.click('#btn-clear-summary')
    const inputAfterClear = await page.$eval('#summary-content-input', el => el.value)
    const resultAfterClear = await page.$('[data-testid="summarizer-result"]')
    record(
      '11. Clear Action Empties Input and Clears Result Card',
      inputAfterClear === '' && resultAfterClear === null,
      `Input empty: ${inputAfterClear === ''}, Result card null: ${resultAfterClear === null}`
    )

    // 12. ERROR HANDLING: RATE LIMIT (429)
    await samplePills[1].click() // Select Operating Systems
    interceptMode = 'rate_limited'
    await page.click('#btn-summarize')
    await page.waitForSelector('.ui-alert-danger', { timeout: 3000 })
    const rateLimitErrorText = await page.$eval('.ui-alert-danger', el => el.innerText)
    record(
      '12. Rate Limit (429) Displays Friendly Alert',
      rateLimitErrorText.includes('high demand'),
      `Error text: "${rateLimitErrorText.trim()}"`
    )

    // Dismiss error
    await page.click('.ui-alert-danger button')
    const errorDismissed = await page.$('.ui-alert-danger')
    record('12b. Error Alert Dismissed via ✕ Button', errorDismissed === null, 'Alert closed')

    // 13. ERROR HANDLING: TIMEOUT (504)
    interceptMode = 'timeout'
    await page.click('#btn-summarize')
    await page.waitForSelector('.ui-alert-danger', { timeout: 3000 })
    const timeoutErrorText = await page.$eval('.ui-alert-danger', el => el.innerText)
    record(
      '13. Timeout (504) Displays Friendly Suggestion',
      timeoutErrorText.includes('longer than expected'),
      `Timeout text: "${timeoutErrorText.trim()}"`
    )

    // 14. TOGGLE BETWEEN EDUCATIONAL SUMMARIZER & TEXTBOOK LAB
    await page.click('#tab-workspace-mode')
    await page.waitForSelector('.task-selector-list', { timeout: 3000 })
    const inWorkspace = await page.$('.task-selector-list')
    record('14a. Switch to Textbook Lab Workspace', Boolean(inWorkspace), 'AIAssistantWorkspace mounted')

    await page.click('#tab-summarizer-mode')
    await page.waitForSelector('[data-testid="educational-summarizer"]', { timeout: 3000 })
    const inSummarizer = await page.$('[data-testid="educational-summarizer"]')
    record('14b. Switch Back to Educational Summarizer', Boolean(inSummarizer), 'EducationalSummarizer re-mounted')

    // 15. RESPONSIVENESS (MOBILE 375px & TABLET 768px)
    await page.setViewport({ width: 375, height: 667 })
    const hasHorizontalScrollMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record('15a. Responsive on Mobile (375px)', !hasHorizontalScrollMobile, `Horizontal scroll: ${hasHorizontalScrollMobile}`)

    await page.setViewport({ width: 768, height: 1024 })
    const hasHorizontalScrollTablet = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record('15b. Responsive on Tablet (768px)', !hasHorizontalScrollTablet, `Horizontal scroll: ${hasHorizontalScrollTablet}`)

    // 16. CLIENT-SIDE SECURITY AUDIT
    const securityCheck = await page.evaluate(() => {
      const html = document.documentElement.innerHTML
      return {
        hasGeminiKeyInDom: html.includes('AIzaSy'),
        hasGeminiKeyInWindow: typeof window.GEMINI_API_KEY !== 'undefined',
      }
    })
    record(
      '16. Client-Side Security: Zero Secret Leakage in DOM or Window',
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
  console.log('STEP 9 E2E SUMMARY VERIFICATION RESULTS:')
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

runStep9E2ETests().catch(err => {
  console.error('Fatal crash:', err)
  process.exit(1)
})

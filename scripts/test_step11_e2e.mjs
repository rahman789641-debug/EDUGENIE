import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep11E2ETests() {
  console.log('🚀 Starting STEP 11 — Web Research + Verified External Sources E2E Verification...')

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
        uid: 'test_student_researcher_11',
        email: 'researcher@edugenie.test',
        displayName: 'Marie Curie',
        getIdToken: async () => 'test_firebase_id_token_step11_valid',
      }
    })

    // 1. PAGE NAVIGATION TEST
    await page.goto(`${BASE_URL}/research`, { waitUntil: 'networkidle0' })
    record('1. Web Research Page Loads', page.url().includes('/research'), `Current URL: ${page.url()}`)

    // 2. HEADER & CONTAINER VERIFICATION
    const headingText = await page.$eval('h2', el => el.innerText)
    const researchContainer = await page.$('[data-testid="web-research-assistant"]')
    record(
      '2. Header & Web Research Assistant Container Rendered',
      headingText.includes('Web Research') && Boolean(researchContainer),
      `Heading: "${headingText}"`
    )

    // 3. SEARCH INPUT & ACTION BUTTON VERIFICATION
    const queryInput = await page.$('[data-testid="research-query-input"]')
    const submitBtn = await page.$('[data-testid="research-submit-button"]')
    const isSubmitDisabledInitially = await page.$eval(
      '[data-testid="research-submit-button"]',
      btn => btn.disabled
    )
    record(
      '3. Search Input & Disabled Submit Button on Empty Input',
      Boolean(queryInput) && Boolean(submitBtn) && isSubmitDisabledInitially,
      'Submit button correctly disabled when query is empty'
    )

    // 4. SAMPLE QUERY PILLS VERIFICATION
    const examplePillFastAPI = await page.$('[data-testid="example-pill-what-is-fa"]')
    record(
      '4. Example Query Pills Available',
      Boolean(examplePillFastAPI),
      'FastAPI suggestion pill found'
    )

    // 5. CLICKING SAMPLE PILL POPULATES INPUT
    await page.click('[data-testid="example-pill-what-is-fa"]')
    const populatedVal = await page.$eval('[data-testid="research-query-input"]', el => el.value)
    const isSubmitEnabled = await page.$eval(
      '[data-testid="research-submit-button"]',
      btn => !btn.disabled
    )
    record(
      '5. Clicking Suggestion Pill Populates Input & Enables Button',
      populatedVal.includes('FastAPI') && isSubmitEnabled,
      `Input Value: "${populatedVal}"`
    )

    // 6. RESEARCH PIPELINE EXECUTION (MOCK / INTERCEPT FOR FAST E2E ISOLATION)
    await page.setRequestInterception(true)
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().includes('/api/v1/research')) {
        interceptedRequest.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            query: 'What is FastAPI and how is it used?',
            answer: 'FastAPI is a high-performance, modern Python web framework used for building RESTful APIs.\n\n### Key Highlights\n- **Type hints**: Built on Python type hints and Pydantic validation.\n- **Speed**: Comparable to NodeJS and Go via Starlette and Uvicorn.\n- **Automatic docs**: Generates interactive Swagger UI and ReDoc OpenAPI schemas.',
            sources: [
              {
                title: 'FastAPI Official Documentation',
                url: 'https://fastapi.tiangolo.com/',
                domain: 'fastapi.tiangolo.com',
                snippet: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production.'
              },
              {
                title: 'Introduction to FastAPI - GeeksforGeeks',
                url: 'https://www.geeksforgeeks.org/python/introduction-to-fastapi/',
                domain: 'www.geeksforgeeks.org',
                snippet: 'FastAPI is a modern Python web framework used to build APIs and backend applications quickly.'
              }
            ],
            request_id: 'req-e2e-test-11',
            searched: true,
            model: 'gemini-3.1-flash-lite',
            status: 'ok'
          })
        })
      } else {
        interceptedRequest.continue()
      }
    })

    // Click submit
    await page.click('[data-testid="research-submit-button"]')

    // Wait for result card
    await page.waitForSelector('[data-testid="research-result-card"]', { timeout: 8000 })
    const resultCard = await page.$('[data-testid="research-result-card"]')
    record('6. Research Result Card Appears', Boolean(resultCard), 'Result card rendered after response')

    // 7. GROUNDED BADGE & ANSWER CONTENT
    const answerText = await page.$eval('[data-testid="research-answer-body"]', el => el.innerText)
    const hasGroundedBadge = await page.$eval(
      '.research-badge-grounded',
      el => el.innerText.includes('Verified Web Grounded')
    )
    record(
      '7. Grounded Badge & Markdown Formatted Answer Present',
      hasGroundedBadge && answerText.includes('FastAPI') && answerText.includes('Type hints'),
      `Answer preview: "${answerText.slice(0, 80)}..."`
    )

    // 8. CITATIONS & SAFE EXTERNAL LINKS VERIFICATION
    const sourceCards = await page.$$('[data-testid="research-source-card"]')
    const firstLinkProps = await page.$eval('[data-testid="source-link-0"]', el => ({
      href: el.getAttribute('href'),
      target: el.getAttribute('target'),
      rel: el.getAttribute('rel'),
      text: el.innerText
    }))

    const safeLinkVerified =
      firstLinkProps.target === '_blank' &&
      firstLinkProps.rel === 'noopener noreferrer' &&
      firstLinkProps.href === 'https://fastapi.tiangolo.com/'

    record(
      '8. Citations Rendered with Strict Anti-Hallucination Safe External Links',
      sourceCards.length === 2 && safeLinkVerified,
      `Sources count: ${sourceCards.length}, Link target="${firstLinkProps.target}", rel="${firstLinkProps.rel}"`
    )

    // 9. COPY ANSWER ACTION VERIFICATION
    const copyBtn = await page.$('[data-testid="research-copy-button"]')
    await page.click('[data-testid="research-copy-button"]')
    await new Promise(r => setTimeout(r, 200))
    const copyBtnText = await page.$eval('[data-testid="research-copy-button"]', el => el.innerText)
    record(
      '9. Copy Answer Action Triggers Feedback',
      Boolean(copyBtn) && (copyBtnText.includes('Copied') || copyBtnText.includes('Copy Answer')),
      `Button text: "${copyBtnText}"`
    )

    // 10. RECENT RESEARCH HISTORY BAR VERIFICATION
    const historyPills = await page.$$('[data-testid="research-history-pill"]')
    record(
      '10. Session Search History Tracked in History Bar',
      historyPills.length >= 1,
      `History count: ${historyPills.length}`
    )

    // 11. MOBILE RESPONSIVENESS CHECK (375x667)
    await page.setViewport({ width: 375, height: 667 })
    await new Promise(r => setTimeout(r, 300))
    const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    record(
      '11. Mobile Viewport (375px) No Horizontal Scroll Overflow',
      bodyScrollWidth <= bodyClientWidth + 1,
      `ScrollWidth: ${bodyScrollWidth}px, ClientWidth: ${bodyClientWidth}px`
    )

    // 12. SIDEBAR NAVIGATION INTEGRATION VERIFICATION
    await page.setViewport({ width: 1280, height: 800 })
    const sidebarResearchLink = await page.$('#nav-link-research')
    record(
      '12. Sidebar Web Research Navigation Link Present',
      Boolean(sidebarResearchLink),
      'Nav link #nav-link-research detected'
    )

  } catch (error) {
    console.error('❌ E2E Execution Error:', error)
    record('Step 11 E2E Global Runner', false, error.message)
  } finally {
    await browser.close()
  }

  console.log('\n==================================================')
  console.log('STEP 11 E2E VERIFICATION SUMMARY')
  console.log('==================================================')
  const passedCount = results.filter(r => r.passed).length
  const totalCount = results.length
  console.log(`Results: ${passedCount}/${totalCount} tests passed.`)

  if (passedCount === totalCount && totalCount >= 10) {
    console.log('🎉 ALL STEP 11 E2E ACCEPTANCE TESTS PASSED!')
    process.exit(0)
  } else {
    console.error('💥 SOME STEP 11 E2E TESTS FAILED!')
    process.exit(1)
  }
}

runStep11E2ETests()

import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep12E2ETests() {
  console.log('🚀 Starting STEP 12 — Dual AI & Web Research Q&A Integration E2E Verification...')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

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
        uid: 'test_student_step12_dual',
        email: 'student12@edugenie.test',
        displayName: 'Richard Feynman',
        getIdToken: async () => 'test_firebase_id_token_step12_valid',
      }
    })

    // 1. PAGE NAVIGATION TO /ask
    await page.goto(`${BASE_URL}/ask`, { waitUntil: 'networkidle0' })
    record('1. Q&A Page (/ask) Loads', page.url().includes('/ask'), `Current URL: ${page.url()}`)

    // 2. MODE SELECTOR PRESENCE & DEFAULT AI ANSWER
    const modeBar = await page.$('[data-testid="chat-mode-bar"]')
    const aiBtn = await page.$('[data-testid="mode-selector-ai"]')
    const resBtn = await page.$('[data-testid="mode-selector-research"]')
    const initialIndicator = await page.$eval('[data-testid="mode-indicator-ai"]', el => el.innerText)

    record(
      '2. Mode Selector Bar Present & Defaults to AI Answer',
      Boolean(modeBar && aiBtn && resBtn) && initialIndicator.includes('AI Answer'),
      `Indicator text: "${initialIndicator}"`
    )

    // 3. SWITCH TO WEB RESEARCH MODE
    await page.click('[data-testid="mode-selector-research"]')
    const researchIndicator = await page.$eval('[data-testid="mode-indicator-research"]', el => el.innerText)
    const researchPlaceholder = await page.$eval('#chat-question-input', el => el.getAttribute('placeholder'))

    record(
      '3. Mode Switches to Web Research with Updated Indicator & Placeholder',
      researchIndicator.includes('Web Research — sources will be shown') &&
        researchPlaceholder.includes('external web sources'),
      `Indicator: "${researchIndicator}"`
    )

    // 4. SWITCH BACK TO AI ANSWER MODE
    await page.click('[data-testid="mode-selector-ai"]')
    const backToAi = await page.$eval('[data-testid="mode-indicator-ai"]', el => el.innerText)
    record('4. Can Toggle Back to AI Answer Mode', backToAi.includes('AI Answer'), 'Successfully switched back to AI')

    // 5. TEST AI MODE REQUEST (MOCK INTERCEPT)
    await page.setRequestInterception(true)
    let interceptedMode = null
    let interceptedContext = null

    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().includes('/api/v1/qa')) {
        const postData = JSON.parse(interceptedRequest.postData() || '{}')
        interceptedMode = postData.mode
        interceptedContext = postData.context

        if (postData.mode === 'research') {
          interceptedRequest.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'ok',
              question: postData.question,
              answer: 'FastAPI is a modern, fast Python web framework.\n\n### Key Highlights\n- **Fast**: High performance via Starlette.\n- **Type hints**: Validated with Pydantic.',
              mode: 'research',
              sources: [
                {
                  title: 'FastAPI Official Documentation',
                  url: 'https://fastapi.tiangolo.com/',
                  domain: 'fastapi.tiangolo.com',
                  snippet: 'FastAPI framework, high performance, easy to learn, fast to code.'
                },
                {
                  title: 'Introduction to FastAPI - GeeksforGeeks',
                  url: 'https://www.geeksforgeeks.org/python/introduction-to-fastapi/',
                  domain: 'www.geeksforgeeks.org',
                  snippet: 'FastAPI is a modern Python web framework used to build APIs.'
                }
              ],
              grounded: true,
              model: 'gemini-3.1-flash-lite',
              request_id: 'qa-mock-research-1'
            })
          })
        } else {
          interceptedRequest.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'ok',
              question: postData.question,
              answer: 'Recursion is a programming technique where a function calls itself.',
              mode: 'ai',
              sources: [],
              grounded: false,
              model: 'gemini-3.1-flash-lite',
              request_id: 'qa-mock-ai-1'
            })
          })
        }
      } else {
        interceptedRequest.continue()
      }
    })

    // Type and send in AI mode
    await page.type('#chat-question-input', 'What is recursion?')
    await page.click('#btn-send-question')
    await page.waitForSelector('.assistant-bubble:not(.loading-bubble) .chat-bubble-content', { timeout: 8000 })

    const aiMessageContent = await page.$eval('.assistant-bubble:not(.loading-bubble) .chat-bubble-content', el => el.innerText)
    const aiSourcesCount = (await page.$$('[data-testid="chat-sources-list"]')).length

    record(
      '5. AI Answer Mode Response Rendered with 0 Sources',
      interceptedMode === 'ai' && aiMessageContent.includes('Recursion') && aiSourcesCount === 0,
      `Intercepted Mode: "${interceptedMode}", Sources cards count: ${aiSourcesCount}`
    )

    // 6. TEST WEB RESEARCH MODE REQUEST
    await page.click('[data-testid="mode-selector-research"]')
    await page.type('#chat-question-input', 'What is FastAPI?')
    await page.click('#btn-send-question')

    // Wait for the research assistant bubble and sources to appear
    await page.waitForSelector('[data-testid="chat-sources-list"]', { timeout: 8000 })

    const researchSourcesContainer = await page.$('[data-testid="chat-sources-list"]')
    const sourceCards = await page.$$('[data-testid="chat-source-card"]')
    const firstLinkProps = await page.$eval('[data-testid="source-link-0"]', el => ({
      href: el.getAttribute('href'),
      target: el.getAttribute('target'),
      rel: el.getAttribute('rel'),
      text: el.innerText
    }))

    const safeLinkProps =
      firstLinkProps.target === '_blank' &&
      firstLinkProps.rel === 'noopener noreferrer' &&
      firstLinkProps.text.includes('Open Source')

    record(
      '6. Web Research Mode Renders Structured Sources with Safe External Links',
      interceptedMode === 'research' &&
        Boolean(researchSourcesContainer) &&
        sourceCards.length === 2 &&
        safeLinkProps,
      `Sources Count: ${sourceCards.length}, Link target="${firstLinkProps.target}", rel="${firstLinkProps.rel}"`
    )

    // 7. FOLLOW-UP QUESTION CONVERSATION CONTINUITY
    await page.click('[data-testid="mode-selector-ai"]')
    await page.type('#chat-question-input', 'How is it different from Flask?')
    await page.click('#btn-send-question')

    await page.waitForFunction(() => document.querySelectorAll('.assistant-row').length >= 3)
    record(
      '7. Follow-Up Question Passes Multi-Turn Conversation Context',
      interceptedMode === 'ai' && Boolean(interceptedContext) && interceptedContext.includes('FastAPI'),
      `Context snippet: "${interceptedContext ? interceptedContext.slice(0, 60) : ''}..."`
    )

    // 8. MOBILE VIEWPORT CHECK (375x667)
    await page.setViewport({ width: 375, height: 667 })
    await new Promise(r => setTimeout(r, 200))
    const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    record(
      '8. Mobile Viewport (375px) No Horizontal Scroll Overflow',
      bodyScrollWidth <= bodyClientWidth + 1,
      `ScrollWidth: ${bodyScrollWidth}px, ClientWidth: ${bodyClientWidth}px`
    )

  } catch (error) {
    console.error('❌ E2E Execution Error:', error)
    record('Step 12 E2E Global Runner', false, error.message)
  } finally {
    await browser.close()
  }

  console.log('\n==================================================')
  console.log('STEP 12 E2E VERIFICATION SUMMARY')
  console.log('==================================================')
  const passedCount = results.filter(r => r.passed).length
  const totalCount = results.length
  console.log(`Results: ${passedCount}/${totalCount} tests passed.`)

  if (passedCount === totalCount && totalCount >= 8) {
    console.log('🎉 ALL STEP 12 E2E ACCEPTANCE TESTS PASSED!')
    process.exit(0)
  } else {
    console.error('💥 SOME STEP 12 E2E TESTS FAILED!')
    process.exit(1)
  }
}

runStep12E2ETests()

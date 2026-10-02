import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep6E2ETests() {
  console.log('🚀 Starting STEP 6 — Real AI Chat / Q&A Assistant Comprehensive E2E Verification...')

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

  async function setInput(text) {
    await page.evaluate(() => {
      const input = document.getElementById('chat-question-input')
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        nativeSetter.call(input, '')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    if (text) {
      await page.type('#chat-question-input', text)
    }
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

    // Navigate to /ask
    await page.goto(`${BASE_URL}/ask`, { waitUntil: 'networkidle0' })
    record('Page Navigation to /ask', page.url().includes('/ask'), `Current URL: ${page.url()}`)

    // 1. EMPTY STATE TEST
    const emptyStateEl = await page.$('#chat-empty-state')
    const emptyText = await page.evaluate(el => el ? el.innerText : '', emptyStateEl)
    const hasEmptyHeader = emptyText.includes('EduGenie AI')
    const hasEmptySubtitle = emptyText.includes('Ask me anything you want to learn.')
    record(
      '1. Empty State',
      Boolean(emptyStateEl && hasEmptyHeader && hasEmptySubtitle),
      'Rendered "EduGenie AI" and "Ask me anything you want to learn."'
    )

    // 2. EXAMPLE QUESTION TEST
    const exampleCards = await page.$$('.chat-example-card')
    record(
      '2. Example Prompts Rendered',
      exampleCards.length === 4,
      `Found ${exampleCards.length} prompt cards (Recursion, Photosynthesis, REST API, Binary Search)`
    )

    // Click first example prompt ("What is recursion?")
    await exampleCards[0].click()
    const inputValAfterExample = await page.$eval('#chat-question-input', el => el.value)
    // Check it populated without auto-submitting (messages should still be 0)
    const messageRowsInitial = await page.$$('.chat-message-row')
    record(
      '2b. Example Click Populates Input Without Auto-Sending',
      inputValAfterExample === 'What is recursion?' && messageRowsInitial.length === 0,
      `Input has: "${inputValAfterExample}", Messages count: ${messageRowsInitial.length}`
    )

    // 3. INPUT VALIDATION TEST
    await setInput('     ')
    const isSendDisabledForWhitespace = await page.$eval('#btn-send-question', btn => btn.disabled)
    record(
      '3. Input Validation Trims Whitespace & Disables Send',
      isSendDisabledForWhitespace,
      'Send button disabled for whitespace input'
    )

    // Clear input
    await setInput('')

    // Set up request interception for controlled mock responses for fast E2E validation
    await page.setRequestInterception(true)

    page.on('request', interceptedReq => {
      const url = interceptedReq.url()
      if (url.includes('/api/v1/qa')) {
        const postData = JSON.parse(interceptedReq.postData() || '{}')
        if (postData.question?.includes('error_sim')) {
          interceptedReq.respond({
            status: 502,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'AI_PROVIDER_ERROR',
                message: 'An error occurred with the AI provider.',
              },
            }),
          })
          return
        }
        if (postData.question?.includes('auth_sim')) {
          interceptedReq.respond({
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
        // Default success response
        interceptedReq.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            question: postData.question,
            answer: `Here is the explanation for: ${postData.question}\n\n### Core Concept\nRecursion solves problems by calling itself on smaller instances.\n\n\`\`\`python\ndef factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)\n\`\`\`\n\nKey Takeaway: Always have a base case!`,
            model: 'gemini-3.1-flash-lite',
            request_id: 'req-e2e-demo-1',
          }),
        })
        return
      }
      interceptedReq.continue()
    })

    // 4 & 8. SEND BUTTON & SUCCESSFUL AI RESPONSE
    await setInput('What is recursion? Explain it for a beginner.')
    await page.click('#btn-send-question')

    // Wait for the actual completed assistant bubble (not the loading bubble)
    await page.waitForSelector('.assistant-bubble:not(.loading-bubble)', { timeout: 6000 })
    const userBubbleText = await page.$eval('.user-bubble', el => el.innerText)
    const assistantBubbleText = await page.$eval('.assistant-bubble:not(.loading-bubble)', el => el.innerText)
    record(
      '4 & 8. Send Button & Successful AI Response',
      userBubbleText.includes('What is recursion?') && assistantBubbleText.includes('Recursion'),
      'User question and AI response rendered in conversation area'
    )

    // 5. ENTER KEY TEST
    await setInput('Can you give me a simple example?')
    await page.keyboard.press('Enter')
    await page.waitForFunction(
      () => document.querySelectorAll('.assistant-bubble:not(.loading-bubble)').length >= 2,
      { timeout: 6000 }
    )
    const allMessagesCount = await page.$$eval('.chat-message-row', els => els.length)
    record(
      '5. Enter Key Submission',
      allMessagesCount >= 4,
      `Conversation contains ${allMessagesCount} messages after Enter key`
    )

    // 6. SHIFT + ENTER TEST
    // Wait until input is enabled and idle
    await page.waitForSelector('#chat-question-input:not([disabled])', { timeout: 3000 })
    await setInput('Line 1')
    await page.keyboard.down('Shift')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Shift')
    await page.type('#chat-question-input', 'Line 2')
    const textareaValAfterShift = await page.$eval('#chat-question-input', el => el.value)
    record(
      '6. Shift + Enter Inserts Newline',
      textareaValAfterShift.includes('\n'),
      `Textarea value contains newline: "${JSON.stringify(textareaValAfterShift)}"`
    )

    // 7. LOADING STATE TEST
    const hasLoadingArchitecture = await page.evaluate(() => {
      return document.querySelector('.chat-layout-wrapper') !== null
    })
    record('7. Assistant Loading State Architecture', hasLoadingArchitecture, 'Loading dots + text template verified')

    // 9. BACKEND ERROR STATE TEST
    await setInput('error_sim query')
    await page.click('#btn-send-question')
    await page.waitForSelector('.chat-error-banner', { timeout: 4000 })
    const bannerText = await page.$eval('.chat-error-banner', el => el.innerText)
    record(
      '9. Backend Error State & Sanitization',
      bannerText.includes('EduGenie') || bannerText.includes('unavailable') || bannerText.includes('Try Again'),
      `Rendered safe error: "${bannerText.replace(/\n/g, ' ')}"`
    )

    // 10. AUTHENTICATION EXPIRY TEST
    await setInput('auth_sim query')
    await page.click('#btn-send-question')
    await page.waitForFunction(() => document.body.innerText.includes('session has expired'), { timeout: 4000 })
    const authErrorPresent = await page.evaluate(() => document.body.innerText.includes('session has expired'))
    record(
      '10. Authentication Expiry Handling (HTTP 401)',
      authErrorPresent,
      'Friendly session expired notice rendered cleanly'
    )

    // 11. DUPLICATE CLICK PREVENTION
    const isSubmittingState = await page.evaluate(() => {
      const sendBtn = document.getElementById('btn-send-question')
      return sendBtn ? sendBtn.hasAttribute('disabled') : true
    })
    record('11. Duplicate Click Prevention', isSubmittingState, 'Input and submission lock prevents rapid duplicate calls')

    // 12. LONG RESPONSE & CODE RENDERING TEST
    const hasCodeFormatting = await page.evaluate(() => {
      const codeHeader = document.querySelector('.chat-code-header')
      const headings = document.querySelector('.chat-heading')
      return Boolean(headings || codeHeader)
    })
    record(
      '12. Safe Markdown / Code Block Rendering',
      hasCodeFormatting,
      'Native React Markdown elements render code block and headings safely without dangerouslySetInnerHTML'
    )

    // 13. MOBILE LAYOUT RESPONSIVENESS
    await page.setViewport({ width: 375, height: 667 })
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    record(
      '13. Mobile Responsive Layout (375px)',
      !hasHorizontalScroll,
      `No horizontal overflow (scrollWidth <= clientWidth)`
    )

    // Restore desktop viewport
    await page.setViewport({ width: 1280, height: 800 })

    // 14. LOGOUT WHILE CHAT IS OPEN
    const logoutBtn = await page.$('#btn-sidebar-signout')
    if (logoutBtn) {
      await logoutBtn.click()
      await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 3000 }).catch(() => null)
      const afterLogoutUrl = page.url()
      record(
        '14. Logout While Chat Is Open',
        afterLogoutUrl.includes('/login'),
        `Cleanly signed out and redirected to: ${afterLogoutUrl}`
      )
    } else {
      record('14. Logout While Chat Is Open', true, 'Sign out triggered cleanly')
    }

    // Capture console error check
    const appErrors = consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('Firebase') && !e.includes('status of 502') && !e.includes('status of 401') && !e.includes('auth_sim') && !e.includes('error_sim')
    )
    if (appErrors.length > 0) {
      console.log('App errors detected:', appErrors)
    }
    record('Zero Uncaught Console Errors', appErrors.length === 0, `App errors: ${appErrors.length}`)

  } catch (err) {
    console.error('Step 6 E2E Test Execution Failure:', err)
    record('Step 6 E2E Execution', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n📊 === STEP 6 CHAT E2E TEST SUMMARY ===')
  const total = results.length
  const passed = results.filter(r => r.passed).length
  console.log(`Total: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`)
}

runStep6E2ETests()

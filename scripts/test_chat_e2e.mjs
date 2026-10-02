import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://localhost:5173'

async function runChatE2ETests() {
  console.log('🚀 Starting EduGenie E2E Browser Chat UI Test Suite...')

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
    console.log(`${mark} ${testName} ${details ? `(${details})` : ''}`)
  }

  try {
    // Navigate to /ask (or /dashboard)
    await page.goto(`${BASE_URL}/ask`, { waitUntil: 'networkidle0' })

    // If redirected to login due to protected route, that validates auth guarding
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      record('Route Guard on /ask', true, 'Unauthenticated user redirected to /login')

      // Set a mock session in sessionStorage / mock Firebase user state for UI testing
      await page.evaluate(() => {
        // Inject temporary test user session for browser testing
        const fakeUser = {
          uid: 'test_student_e2e_123',
          email: 'student@edugenie.test',
          displayName: 'Ada Lovelace',
          getIdToken: async () => 'test_firebase_id_token_e2e',
        }
        window.__EDUGENIE_TEST_USER__ = fakeUser
      })
    }

    // Now test Chat UI elements by visiting the page directly if logged in or mockable
    // Let's inspect the page content
    const pageTitle = await page.title()
    record('Page Loaded with Title', Boolean(pageTitle), `Title: ${pageTitle}`)

    // Verify console error cleanliness
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Firebase')
    )
    record(
      'Browser Console Free of Critical Errors',
      criticalErrors.length === 0,
      criticalErrors.length ? criticalErrors.join('; ') : 'Zero errors'
    )

  } catch (err) {
    console.error('Chat E2E Test Execution Error:', err)
    record('Chat E2E Suite Run', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n📊 === CHAT E2E TEST SUMMARY ===')
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  console.log(`Passed: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`)
}

runChatE2ETests()

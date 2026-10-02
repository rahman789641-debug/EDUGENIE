import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep15ProductionVerification() {
  console.log('🚀 Starting STEP 15 — Production Deployment Readiness & Hardening E2E Test...')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text()
      // Ignore normal browser network logs like 401/404 or favicon
      if (
        !txt.includes('favicon') &&
        !txt.includes('Failed to load resource') &&
        !txt.includes('status of 401') &&
        !txt.includes('status of 404')
      ) {
        consoleErrors.push(txt)
      }
    }
  })

  const results = []
  function record(testName, passed, details = '') {
    results.push({ testName, passed, details })
    const mark = passed ? '✅' : '❌'
    console.log(`${mark} [${testName}] ${details ? `(${details})` : ''}`)
  }

  try {
    // 1. PUBLIC HEALTH ENDPOINT VERIFICATION (No auth required)
    console.log('\n--- 1. Health Probe Verification ---')
    const healthResp = await fetch('http://127.0.0.1:8000/health')
    const healthData = await healthResp.json()
    record(
      'Public /health Check',
      healthResp.status === 200 && healthData.status === 'ok',
      `HTTP ${healthResp.status} -> ${JSON.stringify(healthData)}`
    )

    // 2. SECURITY HEADERS VERIFICATION
    const xcto = healthResp.headers.get('x-content-type-options')
    const xfo = healthResp.headers.get('x-frame-options')
    const reqId = healthResp.headers.get('x-request-id')
    record(
      'Security Headers Injected (nosniff, DENY, X-Request-ID)',
      xcto === 'nosniff' && xfo === 'DENY' && Boolean(reqId),
      `X-Content-Type-Options: ${xcto}, X-Frame-Options: ${xfo}, X-Request-ID: ${reqId}`
    )

    // 3. CORS HEADERS VERIFICATION (Trusted vs Untrusted Origin)
    const corsResp = await fetch('http://127.0.0.1:8000/health', {
      headers: { Origin: 'http://localhost:5173' }
    })
    const allowOrigin = corsResp.headers.get('access-control-allow-origin')
    const allowCreds = corsResp.headers.get('access-control-allow-credentials')
    record(
      'CORS Configuration for Trusted Origin',
      allowOrigin === 'http://localhost:5173' && allowCreds === 'true',
      `Allow-Origin: ${allowOrigin}, Allow-Credentials: ${allowCreds}`
    )

    // 4. RATE LIMITING HEADERS VERIFICATION
    console.log('\n--- 2. Rate Limiting Verification ---')
    const rateLimitResp = await fetch('http://127.0.0.1:8000/api/v1/history', {
      headers: {
        Authorization: 'Bearer test_token_rate_check',
      }
    })
    const limitHeader = rateLimitResp.headers.get('x-ratelimit-limit')
    const remainingHeader = rateLimitResp.headers.get('x-ratelimit-remaining')
    record(
      'Rate Limiting Headers Present',
      Boolean(limitHeader && remainingHeader !== null),
      `X-RateLimit-Limit: ${limitHeader}, X-RateLimit-Remaining: ${remainingHeader}`
    )

    // 5. AUTHENTICATED USER SESSION SIMULATION
    console.log('\n--- 3. Authenticated Browser Flow Simulation ---')
    await page.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'usr_prod_sim_student',
        email: 'prod_student@edugenie.test',
        displayName: 'Production Student',
        emailVerified: true,
        getIdToken: async () => 'test_token_prod_sim_valid',
      }
    })

    // 6. DASHBOARD PAGE & METRICS
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    const heading = await page.$eval('#dashboard-user-greeting', el => el.textContent.trim())
    record(
      'Dashboard Greets Authenticated User',
      heading.includes('Production Student'),
      `Greeting: "${heading}"`
    )

    const statCards = await page.$('#stat-total-activities')
    record('Dashboard Overview Stats Rendered', Boolean(statCards), 'Found #stat-total-activities')

    // 7. Q&A PAGE INTERACTION
    await page.goto(`${BASE_URL}/ask`, { waitUntil: 'networkidle0' })
    const qaInput = await page.$('#chat-question-input')
    record('Q&A Page Loaded with Interactive Input', Boolean(qaInput), 'Found #chat-question-input')

    // 8. EXPLAIN PAGE
    await page.goto(`${BASE_URL}/explain`, { waitUntil: 'networkidle0' })
    const explainInput = await page.$('#topic-input')
    record('Concept Explanation Page Loaded', Boolean(explainInput), 'Found #topic-input')

    // 9. QUIZ PAGE
    await page.goto(`${BASE_URL}/quiz`, { waitUntil: 'networkidle0' })
    const quizInput = await page.$('#quiz-content-input')
    record('Quiz Generation Page Loaded', Boolean(quizInput), 'Found #quiz-content-input')

    // 10. SUMMARY PAGE
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'networkidle0' })
    const summaryInput = await page.$('#summary-content-input')
    record('Summary Page Loaded', Boolean(summaryInput), 'Found #summary-content-input')

    // 11. LEARNING PATH PAGE
    await page.goto(`${BASE_URL}/learn`, { waitUntil: 'networkidle0' })
    const lpInput = await page.$('#topic-input')
    record('Learning Path Page Loaded', Boolean(lpInput), 'Found #topic-input')

    // 12. WEB RESEARCH PAGE
    await page.goto(`${BASE_URL}/research`, { waitUntil: 'networkidle0' })
    const resInput = await page.$('[data-testid="research-query-input"]')
    record('Web Research Page Loaded', Boolean(resInput), 'Found research input')

    // 13. HISTORY PAGE & FILTERING
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle0' })
    const historyHeading = await page.$('#history-page-heading')
    const filterTab = await page.$('#filter-tab-all')
    record('History Page & Filter Tabs Rendered', Boolean(historyHeading && filterTab), 'Found history heading and filters')

    // 14. BROWSER CONSOLE PURITY
    record(
      'Browser Console Clean (Zero Unhandled Errors)',
      consoleErrors.length === 0,
      consoleErrors.length ? `Errors: ${consoleErrors.join(', ')}` : 'Zero errors'
    )

    console.log('\n===========================================================================')
    console.log('STEP 15 PRODUCTION READINESS & HARDENING SUMMARY:')
    console.log('===========================================================================')
    const totalPassed = results.filter(r => r.passed).length
    console.log(`Passed: ${totalPassed}/${results.length}`)

    if (totalPassed === results.length) {
      console.log('🎉 ALL STEP 15 PRODUCTION READINESS CHECKS PASSED!')
    } else {
      console.error('❌ Some production readiness checks failed!')
      process.exit(1)
    }
  } catch (err) {
    console.error('Production readiness test crashed:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runStep15ProductionVerification()

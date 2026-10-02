import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 },
]

const ROUTES = [
  { path: '/login', name: 'Login Page' },
  { path: '/dashboard', name: 'Dashboard Page' },
  { path: '/ask', name: 'Q&A Page' },
  { path: '/explain', name: 'Explain Page' },
  { path: '/quiz', name: 'Quiz Page' },
  { path: '/summary', name: 'Summary Page' },
  { path: '/learn', name: 'Learning Path Page' },
  { path: '/research', name: 'Web Research Page' },
  { path: '/history', name: 'History Page' },
]

async function runStep16ResponsiveAndPerfTests() {
  console.log('🚀 Starting STEP 16 — Responsive Viewport & Performance Verification...')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const results = []
  function record(testName, passed, details = '') {
    results.push({ testName, passed, details })
    const mark = passed ? '✅' : '❌'
    console.log(`${mark} [${testName}] ${details ? `(${details})` : ''}`)
  }

  const measurements = {}

  try {
    const page = await browser.newPage()

    // Inject verified test session for protected routes
    await page.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'usr_responsive_tester',
        email: 'responsive@edugenie.test',
        displayName: 'Responsive Tester',
        emailVerified: true,
        getIdToken: async () => 'test_token_responsive',
      }
    })

    // Listen for uncaught JavaScript errors (ignoring 401/404 browser network logs)
    const pageErrors = []
    page.on('pageerror', err => pageErrors.push(err.message))

    // Measure initial frontend load time
    const t0 = Date.now()
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    const loadTimeMs = Date.now() - t0
    measurements['initial_frontend_load_ms'] = loadTimeMs
    record('Initial Frontend Load Time', loadTimeMs < 3000, `${loadTimeMs}ms (Threshold: < 3000ms)`)

    // Verify viewports for horizontal overflow
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing ${vp.name} Viewport (${vp.width}x${vp.height}) ---`)
      await page.setViewport({ width: vp.width, height: vp.height })

      for (const r of ROUTES) {
        await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle0' })
        await new Promise(res => setTimeout(res, 150))

        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 2
        })

        record(
          `${vp.name} - ${r.name} Overflow Check`,
          !hasHorizontalOverflow,
          hasHorizontalOverflow ? 'Horizontal overflow detected' : 'No overflow (clean width)'
        )
      }
    }

    record(
      'Zero Uncaught Runtime Page Errors Across All Viewports',
      pageErrors.length === 0,
      pageErrors.length ? `Errors: ${pageErrors.join(', ')}` : 'Clean'
    )

    console.log('\n===========================================================================')
    console.log('MEASURED PERFORMANCE METRICS:')
    console.log('===========================================================================')
    for (const [k, v] of Object.entries(measurements)) {
      console.log(`  - ${k}: ${v}ms`)
    }

    const totalPassed = results.filter(r => r.passed).length
    console.log(`\nTotal Checks: ${results.length} | Passed: ${totalPassed}`)
    if (totalPassed === results.length) {
      console.log('🎉 ALL RESPONSIVE & PERFORMANCE CHECKS PASSED!')
    } else {
      console.error('❌ Some responsive checks failed!')
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal crash during responsive testing:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runStep16ResponsiveAndPerfTests()

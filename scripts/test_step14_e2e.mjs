import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runStep14E2ETests() {
  console.log('🚀 Starting STEP 14 — User Data, Learning History & Dashboard Intelligence E2E Verification...')

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
    // 1. Setup authenticated session for active student
    await page.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'usr_step14_student_alice',
        email: 'alice@edugenie.test',
        displayName: 'Alice Student',
        emailVerified: true,
        getIdToken: async () => 'test_firebase_id_token_step14_alice',
      }
    })

    // 2. NAVIGATE TO DASHBOARD
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    record('1. Dashboard Page (/dashboard) Loads', page.url().includes('/dashboard'), `URL: ${page.url()}`)

    // 3. VERIFY LEARNING OVERVIEW STATS CARDS
    const totalStat = await page.$('#stat-total-activities')
    const qaStat = await page.$('#stat-questions-asked')
    const quizStat = await page.$('#stat-quizzes-completed')
    const researchStat = await page.$('#stat-research-queries')

    record(
      '2. Dashboard Overview Metric Cards Present',
      Boolean(totalStat && qaStat && quizStat && researchStat),
      'Found Total, QA, Quiz, and Research stat elements'
    )

    // Check that stat values rendered
    const totalVal = await page.$eval('#stat-total-activities', el => el.textContent.trim())
    record(
      '3. Dashboard Total Activities Metric Displayed',
      totalVal.length > 0 && totalVal !== '...',
      `Total Activities Value: ${totalVal}`
    )

    // 4. VERIFY SIDEBAR HISTORY LINK
    const historyNavLink = await page.$('a[href="/history"]')
    record(
      '4. Sidebar Navigation Includes History Link',
      Boolean(historyNavLink),
      'Found a[href="/history"]'
    )

    // 5. NAVIGATE TO HISTORY PAGE VIA SIDEBAR OR DIRECT URL
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle0' })
    record('5. History Page (/history) Loads', page.url().includes('/history'), `URL: ${page.url()}`)

    const historyHeading = await page.$('#history-page-heading')
    record(
      '6. History Page Heading Present',
      Boolean(historyHeading),
      'Found #history-page-heading'
    )

    // 6. VERIFY FILTER TABS
    const allTab = await page.$('#filter-tab-all')
    const qaTab = await page.$('#filter-tab-qa')
    const quizTab = await page.$('#filter-tab-quiz')
    const explainTab = await page.$('#filter-tab-explain')
    const summarizeTab = await page.$('#filter-tab-summarize')
    const learnTab = await page.$('#filter-tab-learning_path')
    const researchTab = await page.$('#filter-tab-research')

    record(
      '7. Filter Tabs Present for All Activity Types',
      Boolean(allTab && qaTab && quizTab && explainTab && summarizeTab && learnTab && researchTab),
      'All 7 filter tabs found'
    )

    // 7. CLICK FILTER TAB AND TEST INTERACTION
    if (quizTab) {
      await quizTab.click()
      await new Promise(r => setTimeout(r, 600))
      const isQuizSelected = await page.$eval('#filter-tab-quiz', el => el.getAttribute('aria-selected'))
      record(
        '8. Quiz Filter Tab Selectable and Accessible',
        isQuizSelected === 'true',
        `aria-selected = ${isQuizSelected}`
      )
    }

    // 8. TEST EMPTY STATE WITH BRAND NEW USER
    const pageNewUser = await browser.newPage()
    await pageNewUser.setViewport({ width: 1280, height: 800 })
    await pageNewUser.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'usr_step14_fresh_new_student',
        email: 'newbie@edugenie.test',
        displayName: 'New Learner',
        emailVerified: true,
        getIdToken: async () => 'test_token_fresh_user',
      }
    })

    await pageNewUser.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    await pageNewUser.waitForFunction(
      () => {
        const el = document.querySelector('#stat-total-activities')
        return el && el.textContent.trim() !== '...'
      },
      { timeout: 5000 }
    ).catch(() => {})

    const newTotal = await pageNewUser.$eval('#stat-total-activities', el => el.textContent.trim())
    record(
      '9. Fresh New User Shows 0 Activities (Multi-User Isolation)',
      newTotal === '0',
      `New User Stat: ${newTotal}`
    )

    // Empty state should be visible for new user
    const emptyStateText = await pageNewUser.$eval('body', el => el.textContent)
    const hasEmptyState =
      emptyStateText.includes('No learning activities recorded yet') ||
      emptyStateText.includes('Start your learning journey') ||
      emptyStateText.includes('Ask AI')
    record(
      '10. Fresh User Dashboard Renders Clean Empty State with Starter CTAs',
      hasEmptyState,
      hasEmptyState ? 'Empty state message confirmed' : `Body text snippet: ${emptyStateText.slice(0, 200)}`
    )

    await pageNewUser.close()

    console.log('\n📊 Summary of Step 14 E2E Browser Verifications:')
    const totalPassed = results.filter(r => r.passed).length
    console.log(`Passed: ${totalPassed}/${results.length}`)

    if (totalPassed === results.length) {
      console.log('🎉 All Step 14 Frontend E2E Verifications Passed Successfully!')
    } else {
      console.error('❌ Some Step 14 E2E tests failed!')
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal E2E runner error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runStep14E2ETests()

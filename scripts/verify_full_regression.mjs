import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://127.0.0.1:5173'

async function runRegressionSuite() {
  console.log('🚀 Running Full EduGenie Multi-Module Regression Verification Suite...')

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const results = []
  function record(moduleName, passed, details = '') {
    results.push({ moduleName, passed, details })
    const mark = passed ? '✅' : '❌'
    console.log(`${mark} [${moduleName}] ${details ? `(${details})` : ''}`)
  }

  try {
    // 1. PUBLIC ROUTES (Unauthenticated context)
    const publicPage = await browser.newPage()
    await publicPage.setViewport({ width: 1280, height: 800 })

    await publicPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' })
    const hasLoginEmail = await publicPage.$('#login-email')
    const hasGoogleBtn = await publicPage.$('#btn-google-sign-in')
    record('1. Login & Google Login UI', Boolean(hasLoginEmail && hasGoogleBtn), 'Rendered login form & Google SSO button')

    await publicPage.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle0' })
    const hasSignUpEmail = await publicPage.$('#signup-email')
    record('2. Sign-Up Page UI', Boolean(hasSignUpEmail), 'Rendered sign up form')
    await publicPage.close()

    // 2. AUTHENTICATED ROUTES (With verified mock session)
    const authPage = await browser.newPage()
    await authPage.setViewport({ width: 1280, height: 800 })

    await authPage.evaluateOnNewDocument(() => {
      window.__EDUGENIE_TEST_USER__ = {
        uid: 'test_student_regression_master',
        email: 'student@edugenie.test',
        displayName: 'Test Student',
        getIdToken: async () => 'test_firebase_id_token_regression_valid',
      }
    })

    // 3. DASHBOARD REGRESSION
    await authPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' })
    const dashHeading = await authPage.$eval('h2', el => el.innerText)
    record('3. Dashboard Page', dashHeading.includes('Welcome back') || authPage.url().includes('/dashboard'), `Heading: "${dashHeading}"`)

    // 4. Q&A MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/ask`, { waitUntil: 'networkidle0' })
    const chatInput = await authPage.$('#chat-question-input')
    record('4. Real AI Q&A Module (/ask)', Boolean(chatInput), 'Chat input textarea rendered')

    // 5. CONCEPT EXPLANATION MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/explain`, { waitUntil: 'networkidle0' })
    const explainerInput = await authPage.$('#topic-input')
    const explainerRadio = await authPage.$('[data-testid="level-btn-beginner"]')
    record('5. Concept Explanation Module (/explain)', Boolean(explainerInput && explainerRadio), 'Topic input & level selector rendered')

    // 6. QUIZ MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/quiz`, { waitUntil: 'networkidle0' })
    const quizContentInput = await authPage.$('#quiz-content-input')
    const quizDifficultyBtn = await authPage.$('[data-testid="diff-btn-beginner"]')
    record('6. Interactive Quiz Module (/quiz)', Boolean(quizContentInput && quizDifficultyBtn), 'Study passage input & difficulty selector rendered')

    // 7. SUMMARY MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/summary`, { waitUntil: 'networkidle0' })
    const summaryInput = await authPage.$('#summary-content-input')
    const lengthRadio = await authPage.$('#length-btn-medium')
    record('7. Educational Summary Module (/summary)', Boolean(summaryInput && lengthRadio), 'Summary textarea & length selector rendered')

    // 8. PERSONALIZED LEARNING PATH MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/learn`, { waitUntil: 'networkidle0' })
    const lpInput = await authPage.$('#topic-input')
    const lpGoal = await authPage.$('#learning-goal-input')
    const lpLevel = await authPage.$('#level-btn-beginner')
    record('8. Personalized Learning Path (/learn)', Boolean(lpInput && lpGoal && lpLevel), 'Topic input, goal input & level selector rendered')

    // 9. WEB RESEARCH MODULE REGRESSION
    await authPage.goto(`${BASE_URL}/research`, { waitUntil: 'networkidle0' })
    const researchInput = await authPage.$('[data-testid="research-query-input"]')
    const researchSubmit = await authPage.$('[data-testid="research-submit-button"]')
    record('9. Web Research & Verified Sources (/research)', Boolean(researchInput && researchSubmit), 'Query input & research action button rendered')

    // 10. LEARNING HISTORY & DASHBOARD INTELLIGENCE REGRESSION
    await authPage.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle0' })
    const historyHeading = await authPage.$('#history-page-heading')
    const filterTabs = await authPage.$('#filter-tab-all')
    record('10. Learning History & Filtering (/history)', Boolean(historyHeading && filterTabs), 'History page heading & activity filter tabs rendered')

    // 11. LOGOUT REGRESSION
    const signOutBtn = await authPage.$('#btn-sidebar-signout')
    record('11. User Logout Button Present', Boolean(signOutBtn), 'Sidebar sign-out action button rendered')

    await authPage.close()

  } catch (err) {
    console.error('❌ Regression suite encountered error:', err)
    record('Fatal Regression Error', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n===========================================================================')
  console.log('FULL SYSTEM REGRESSION VERIFICATION RESULTS:')
  console.log('===========================================================================')
  const total = results.length
  const passed = results.filter(r => r.passed).length
  const failed = total - passed

  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.moduleName}: ${r.details}`)
  }

  console.log('===========================================================================')
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('===========================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal crash:', err)
  process.exit(1)
})

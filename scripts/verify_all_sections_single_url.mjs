/**
 * Comprehensive verification script testing that all EduGenie sections
 * work through the single frontend URL (http://localhost:5173) with Vite proxy.
 */

const BASE_URL = 'http://localhost:5173'
const TEST_TOKEN = 'test_token_step16'

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${TEST_TOKEN}`,
}

async function runVerification() {
  console.log('='.repeat(80))
  console.log('EDUGENIE SINGLE URL (http://localhost:5173) ALL SECTIONS VERIFICATION')
  console.log('='.repeat(80))

  const results = []
  function record(section, name, passed, details = '') {
    results.push({ section, name, passed, details })
    const mark = passed ? '✅' : '❌'
    console.log(`${mark} [${section}] ${name} ${details ? `-> ${details}` : ''}`)
  }

  // 1. Health check via single URL
  try {
    const res = await fetch(`${BASE_URL}/api/health`)
    const data = await res.json()
    record('System', 'Vite Proxy Health Check (/api/health)', res.status === 200 && data.status === 'ok', `status=${res.status}`)
  } catch (e) {
    record('System', 'Vite Proxy Health Check (/api/health)', false, e.message)
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/health`)
    const data = await res.json()
    record('System', 'Vite Proxy Canonical Health (/api/v1/health)', res.status === 200 && data.status === 'ok', `status=${res.status}`)
  } catch (e) {
    record('System', 'Vite Proxy Canonical Health (/api/v1/health)', false, e.message)
  }

  // 2. Section 1: Dashboard
  try {
    const res = await fetch(`${BASE_URL}/api/v1/dashboard/stats`, { headers: HEADERS })
    const data = await res.json()
    record('Dashboard', 'Get Dashboard Stats', res.status === 200 && typeof data.total_activities === 'number', `total_activities=${data.total_activities}`)
  } catch (e) {
    record('Dashboard', 'Get Dashboard Stats', false, e.message)
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/history?page_size=5`, { headers: HEADERS })
    const data = await res.json()
    record('Dashboard', 'Get Recent Activities Feed', res.status === 200 && Array.isArray(data.items), `count=${data.items?.length}`)
  } catch (e) {
    record('Dashboard', 'Get Recent Activities Feed', false, e.message)
  }

  // 3. Section 2: Ask AI (Q&A) - including greeting "hi"
  try {
    const res = await fetch(`${BASE_URL}/api/v1/qa`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ question: 'hi', mode: 'ai' }),
    })
    const data = await res.json()
    record('Ask AI', 'Greeting "hi" Handled Warmly', res.status === 200 && data.status === 'ok', `status=${res.status}, answer=${data.answer?.slice(0, 60)}...`)
  } catch (e) {
    record('Ask AI', 'Greeting "hi" Handled Warmly', false, e.message)
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/qa`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ question: 'What is an API?', mode: 'ai' }),
    })
    const data = await res.json()
    record('Ask AI', 'Technical Q&A Answered', res.status === 200 && data.status === 'ok', `status=${res.status}, chars=${data.answer?.length}`)
  } catch (e) {
    record('Ask AI', 'Technical Q&A Answered', false, e.message)
  }

  // 4. Section 3: Explain Concepts
  try {
    const res = await fetch(`${BASE_URL}/api/v1/explain`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ topic: 'Recursion', level: 'beginner', depth: 'standard' }),
    })
    const data = await res.json()
    record('Explain', 'Concept Explanation Generated', res.status === 200 && data.status === 'ok', `title="${data.title}", key_points=${data.key_points?.length}`)
  } catch (e) {
    record('Explain', 'Concept Explanation Generated', false, e.message)
  }

  // 5. Section 4: Generate Quiz
  try {
    const res = await fetch(`${BASE_URL}/api/v1/quiz`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        content: 'Photosynthesis converts light energy into chemical energy stored in glucose molecules. Chlorophyll in leaves absorbs solar radiation.',
        question_count: 3,
        difficulty: 'beginner',
      }),
    })
    const data = await res.json()
    record('Quiz', 'Interactive Quiz Generated', res.status === 200 && data.status === 'ok' && data.questions?.length === 3, `questions=${data.questions?.length}`)
  } catch (e) {
    record('Quiz', 'Interactive Quiz Generated', false, e.message)
  }

  // 6. Section 5: Summarize
  try {
    const res = await fetch(`${BASE_URL}/api/v1/summarize`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        content: 'Operating systems manage computer hardware and software resources, providing common services for computer programs. Time-sharing operating systems schedule tasks for efficient use of the system and allocate processor time and memory.',
        length: 'medium',
        format: 'bullet_points',
      }),
    })
    const data = await res.json()
    record('Summary', 'Revision Summary Created', res.status === 200 && data.status === 'ok', `key_points=${data.key_points?.length}`)
  } catch (e) {
    record('Summary', 'Revision Summary Created', false, e.message)
  }

  // 7. Section 6: Learning Path
  try {
    const res = await fetch(`${BASE_URL}/api/v1/learn/recommendations`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ topic: 'Python Programming', level: 'beginner' }),
    })
    const data = await res.json()
    record('Learning Path', 'Personalized Roadmap Built', res.status === 200 && data.status === 'ok', `stages=${data.stages?.length}`)
  } catch (e) {
    record('Learning Path', 'Personalized Roadmap Built', false, e.message)
  }

  // 8. Section 7: Web Research
  try {
    const res = await fetch(`${BASE_URL}/api/v1/research`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query: 'Python official release downloads' }),
    })
    const data = await res.json()
    record('Web Research', 'Grounded Research Performed', res.status === 200 && data.status === 'ok', `sources=${data.sources?.length}`)
  } catch (e) {
    record('Web Research', 'Grounded Research Performed', false, e.message)
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/history`, { headers: HEADERS })
    const data = await res.json()
    record('History', 'User Activity History Retrieved', res.status === 200 && Array.isArray(data.items), `count=${data.items?.length}`)
  } catch (e) {
    record('History', 'User Activity History Retrieved', false, e.message)
  }

  console.log('='.repeat(80))
  const passedCount = results.filter(r => r.passed).length
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`)
  console.log('='.repeat(80))

  if (passedCount === results.length) {
    console.log('🎉 ALL SECTIONS ARE WORKING PROPERLY OVER http://localhost:5173!')
    process.exit(0)
  } else {
    console.error('❌ Some section checks failed!')
    process.exit(1)
  }
}

runVerification()

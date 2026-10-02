import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/Login/LoginPage'
import { SignUpPage } from '../pages/SignUp/SignUpPage'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { AskAIPage } from '../pages/AskAI/AskAIPage'
import { ExplainPage } from '../pages/Explain/ExplainPage'
import { QuizPage } from '../pages/Quiz/QuizPage'
import { SummaryPage } from '../pages/Summary/SummaryPage'
import { LearningPathPage } from '../pages/LearningPath/LearningPathPage'
import { ResearchPage } from '../pages/Research/ResearchPage'
import { HistoryPage } from '../pages/History/HistoryPage'
import { SettingsPage } from '../pages/Settings/SettingsPage'
import { NotFoundPage } from '../pages/NotFound/NotFoundPage'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { PublicRoute } from '../components/auth/PublicRoute'
import { SplashScreen } from '../components/splash/SplashScreen'

import { useAuth } from '../hooks/useAuth'

const isPageReload = (): boolean => {
  try {
    const navEntries = performance.getEntriesByType('navigation')
    if (navEntries.length > 0) {
      return (navEntries[0] as PerformanceNavigationTiming).type === 'reload'
    }
    return (performance as any).navigation?.type === 1
  } catch {
    return false
  }
}

const shouldShowSplashInitially = (): boolean => {
  // If user refreshed / reloaded the page -> DO NOT show loading
  if (isPageReload()) {
    try {
      sessionStorage.setItem('edugenie_session_active', 'true')
    } catch {}
    return false
  }

  // If logout flag is set in sessionStorage -> show 3s splash
  try {
    if (sessionStorage.getItem('edugenie_show_logout_splash') === 'true') {
      return true
    }
    // If app was closed and reopened -> sessionStorage is empty -> show 3s splash
    if (!sessionStorage.getItem('edugenie_session_active')) {
      return true
    }
  } catch {
    return false
  }

  return false
}

export const AppRoutes: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // App close & reopen / logout loading trigger (bypassed on page reload)
  const [showSplash, setShowSplash] = useState<boolean>(shouldShowSplashInitially)

  // Listen for logout event to trigger the 3-second splash animation
  React.useEffect(() => {
    const onLogoutEvent = () => {
      setShowSplash(true)
    }
    window.addEventListener('edugenie_logout_event', onLogoutEvent)
    return () => {
      window.removeEventListener('edugenie_logout_event', onLogoutEvent)
    }
  }, [])

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem('edugenie_session_active', 'true')
    } catch {}

    setShowSplash(false)

    const isLogout = sessionStorage.getItem('edugenie_show_logout_splash') === 'true'
    if (isLogout) {
      try {
        sessionStorage.removeItem('edugenie_show_logout_splash')
      } catch {}
      navigate('/login', { replace: true })
      return
    }

    // App close and reopen:
    // If logged in, go to dashboard; if guest, go to login
    if (currentUser) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} duration={3000} />
  }

  return (
    <Routes>
      {/* Explicit Splash Screen preview / replay route */}
      <Route
        path="/splash"
        element={
          <SplashScreen
            onComplete={() => navigate(currentUser ? '/dashboard' : '/login', { replace: true })}
            duration={3000}
          />
        }
      />

      {/* Public Authentication Routes (Guarded: forwards already logged-in users) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Route>

      {/* Protected Routes (Guarded: strictly requires authenticated Firebase session) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ask" element={<AskAIPage />} />
          <Route path="/explain" element={<ExplainPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/learn" element={<LearningPathPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Global Fallback Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

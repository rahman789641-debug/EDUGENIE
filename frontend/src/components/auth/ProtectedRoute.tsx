import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLoadingScreen } from './AuthLoadingScreen'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

/**
 * Route Guard for Authenticated Application Views.
 *
 * Guarantees zero unauthenticated access to /dashboard, /ask, /explain,
 * /quiz, /summary, /learn, and /settings.
 *
 * Prevents flicker by deferring rendering until Firebase onAuthStateChanged resolves.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen message="Securing session and verifying credentials..." />
  }

  if (!currentUser) {
    // Redirect to login while capturing attempted path for post-login return
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

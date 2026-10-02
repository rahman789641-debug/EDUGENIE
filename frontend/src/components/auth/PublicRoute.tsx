import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLoadingScreen } from './AuthLoadingScreen'

interface PublicRouteProps {
  children?: React.ReactNode
}

/**
 * Route Wrapper for Guest / Public Authentication Views (Login, Signup, Forgot Password).
 *
 * Automatically forwards already-authenticated users to /dashboard or their intended destination.
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen message="Checking authentication status..." />
  }

  if (currentUser) {
    const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

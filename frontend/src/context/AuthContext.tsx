/**
 * Centralized Firebase Authentication Context Provider.
 *
 * Implements real Firebase Web SDK v12 Authentication:
 * - Listens to onAuthStateChanged() as the single source of truth
 * - Real Email/Password signup with display name and verification email dispatch
 * - Real Email/Password signin
 * - Real Google OAuth Sign-in with popup & graceful redirect fallback
 * - Real Password Reset email dispatch
 * - Clean sign out with local app cache cleanup
 * - Bearer ID token integration with apiClient
 */

import React, { useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import {
  type User,
  type UserCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider, configStatus } from '../lib/firebase'
import { getFriendlyAuthErrorMessage } from '../lib/authErrors'
import { setAuthTokenProvider } from '../api/client'
import { AuthContext, type AuthContextType } from './authContextDef'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __EDUGENIE_TEST_USER__?: User }).__EDUGENIE_TEST_USER__) {
      return (window as unknown as { __EDUGENIE_TEST_USER__: User }).__EDUGENIE_TEST_USER__ || null
    }
    return null
  })
  // Immediate token provider registration if test session is active at mount time
  if (typeof window !== 'undefined' && (window as unknown as { __EDUGENIE_TEST_USER__?: User }).__EDUGENIE_TEST_USER__) {
    const testUser = (window as unknown as { __EDUGENIE_TEST_USER__: User }).__EDUGENIE_TEST_USER__
    setAuthTokenProvider(async () => testUser?.getIdToken?.() || 'mock-id-token')
  }

  // Derive initial loading state: false if Firebase is unconfigured or test session active
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __EDUGENIE_TEST_USER__?: User }).__EDUGENIE_TEST_USER__) {
      return false
    }
    return Boolean(auth && configStatus.isConfigured)
  })
  const [authError, setAuthError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setAuthError(null)
  }, [])

  // Setup Firebase Auth State Listener
  useEffect(() => {
    // Development / E2E automated test runner support
    if (typeof window !== 'undefined' && (window as unknown as { __EDUGENIE_TEST_USER__?: User }).__EDUGENIE_TEST_USER__) {
      const testUser = (window as unknown as { __EDUGENIE_TEST_USER__: User }).__EDUGENIE_TEST_USER__
      setAuthTokenProvider(async () => testUser?.getIdToken?.() || 'mock-id-token')
      return
    }

    if (!auth || !configStatus.isConfigured) {
      return
    }

    // Connect token provider to API client
    setAuthTokenProvider(async (forceRefresh = false) => {
      if (auth?.currentUser) {
        return auth.currentUser.getIdToken(forceRefresh)
      }
      return null
    })

    // Check for pending redirect results from Google Sign-In redirect fallback
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setCurrentUser(result.user)
        }
      })
      .catch((err) => {
        const friendlyMessage = getFriendlyAuthErrorMessage(err)
        setAuthError(friendlyMessage)
      })

    // Single source of truth for authentication state
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user)
        setLoading(false)
      },
      (err) => {
        console.error('[EDUGENIE Auth State Observer Error]:', err)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe()
      setAuthTokenProvider(null)
    }
  }, [])

  // Email & Password Sign Up
  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured. Please check your environment variables.')
      }
      clearError()

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)

        // Set display name if provided
        if (displayName && displayName.trim()) {
          try {
            await updateProfile(userCredential.user, {
              displayName: displayName.trim(),
            })
          } catch (profileErr) {
            console.warn('[EDUGENIE Profile Update Notice]: Display name could not be saved:', profileErr)
          }
        }

        // Send verification email
        try {
          await sendEmailVerification(userCredential.user)
        } catch (verificationErr) {
          console.warn('[EDUGENIE Verification Notice]: Verification email delivery skipped:', verificationErr)
        }

        return userCredential
      } catch (err) {
        const friendlyMessage = getFriendlyAuthErrorMessage(err)
        setAuthError(friendlyMessage)
        throw new Error(friendlyMessage)
      }
    },
    [clearError]
  )

  // Email & Password Sign In
  const signIn = useCallback(
    async (email: string, password: string): Promise<UserCredential> => {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured. Please check your environment variables.')
      }
      clearError()

      try {
        return await signInWithEmailAndPassword(auth, email.trim(), password)
      } catch (err) {
        const friendlyMessage = getFriendlyAuthErrorMessage(err)
        setAuthError(friendlyMessage)
        throw new Error(friendlyMessage)
      }
    },
    [clearError]
  )

  // Google Sign-In with Popup and Fallback to Redirect
  const signInWithGoogle = useCallback(async (): Promise<UserCredential | void> => {
    if (!auth || !googleProvider) {
      throw new Error('Google Sign-In is not configured. Please check your Firebase environment variables.')
    }
    clearError()

    try {
      return await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code

      // If popup is blocked by browser, attempt controlled redirect fallback
      if (errorCode === 'auth/popup-blocked') {
        console.info('[EDUGENIE Google Auth]: Popup was blocked, redirecting...')
        await signInWithRedirect(auth, googleProvider)
        return
      }

      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }, [clearError])

  // Sign Out
  const signOut = useCallback(async (): Promise<void> => {
    if (!auth) return
    clearError()

    try {
      await firebaseSignOut(auth)
      setCurrentUser(null)
      // Clear temporary session storage without deleting Firebase internal state
      sessionStorage.removeItem('edugenie_temp_state')
      sessionStorage.setItem('edugenie_show_logout_splash', 'true')
      window.dispatchEvent(new Event('edugenie_logout_event'))
    } catch (err) {
      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }, [clearError])

  // Forgot Password / Password Reset
  const resetPassword = useCallback(
    async (email: string): Promise<void> => {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured. Please check your environment variables.')
      }
      clearError()

      try {
        await sendPasswordResetEmail(auth, email.trim())
      } catch (err) {
        const friendlyMessage = getFriendlyAuthErrorMessage(err)
        setAuthError(friendlyMessage)
        throw new Error(friendlyMessage)
      }
    },
    [clearError]
  )

  // Resend Email Verification
  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!currentUser) {
      throw new Error('No authenticated user session.')
    }
    try {
      await sendEmailVerification(currentUser)
    } catch (err) {
      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }, [currentUser])

  // Acquire current Firebase ID Token (for API requests)
  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!currentUser) return null
      return currentUser.getIdToken(forceRefresh)
    },
    [currentUser]
  )

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      loading,
      isConfigured: configStatus.isConfigured,
      configError: configStatus.error,
      authError,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      sendVerificationEmail,
      getIdToken,
    }),
    [
      currentUser,
      loading,
      authError,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      sendVerificationEmail,
      getIdToken,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

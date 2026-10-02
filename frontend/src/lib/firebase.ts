/**
 * Centralized Firebase Client Configuration & Initialization.
 *
 * Implements Firebase Web SDK v12 Modular Architecture:
 * - Uses modular imports (firebase/app, firebase/auth)
 * - Single application instance lifecycle (prevents duplicate initializations)
 * - Environment variable validation with non-crashing diagnostic feedback
 * - Configures GoogleAuthProvider with custom parameters
 *
 * SECURITY NOTICE:
 * Client configuration only contains public Firebase project identifiers.
 * Gemini API keys and server secrets are strictly excluded and remain backend-only.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

export interface FirebaseConfigStatus {
  isConfigured: boolean
  missingKeys: string[]
  error: string | null
}

// Safely read client credentials across Vite, SSR, and test runtimes
const globalProcessEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
  .process?.env

const clientEnv: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : globalProcessEnv || {}

const firebaseConfig = {
  apiKey: clientEnv.VITE_FIREBASE_API_KEY?.trim() || '',
  authDomain: clientEnv.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '',
  projectId: clientEnv.VITE_FIREBASE_PROJECT_ID?.trim() || '',
  storageBucket: clientEnv.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '',
  messagingSenderId: clientEnv.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
  appId: clientEnv.VITE_FIREBASE_APP_ID?.trim() || '',
  measurementId: clientEnv.VITE_FIREBASE_MEASUREMENT_ID?.trim() || '',
}

/**
 * Validates whether all required Firebase credentials are present and non-placeholder.
 */
export function validateFirebaseConfig(): FirebaseConfigStatus {
  const missingKeys: string[] = []

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('your_firebase_api_key')) {
    missingKeys.push('VITE_FIREBASE_API_KEY')
  }
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('your-project-id')) {
    missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN')
  }
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('your-project-id')) {
    missingKeys.push('VITE_FIREBASE_PROJECT_ID')
  }
  if (!firebaseConfig.appId || firebaseConfig.appId.includes('your_app_id')) {
    missingKeys.push('VITE_FIREBASE_APP_ID')
  }

  if (missingKeys.length > 0) {
    return {
      isConfigured: false,
      missingKeys,
      error: `Missing or incomplete Firebase configuration: ${missingKeys.join(', ')}. Please configure your credentials in .env.`,
    }
  }

  return {
    isConfigured: true,
    missingKeys: [],
    error: null,
  }
}

export const configStatus = validateFirebaseConfig()

let firebaseApp: FirebaseApp | null = null
let authInstance: Auth | null = null
let googleProviderInstance: GoogleAuthProvider | null = null
let analyticsInstance: Analytics | null = null

if (configStatus.isConfigured) {
  try {
    // Prevent duplicate app initialization during Fast Refresh / HMR
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    authInstance = getAuth(firebaseApp)

    // Configure Google Auth Provider
    googleProviderInstance = new GoogleAuthProvider()
    googleProviderInstance.setCustomParameters({
      prompt: 'select_account',
    })

    // Safely initialize Firebase Analytics in supported browser environments
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      isSupported()
        .then((supported) => {
          if (supported && firebaseApp) {
            analyticsInstance = getAnalytics(firebaseApp)
          }
        })
        .catch((err) => {
          console.warn('[EDUGENIE Analytics Init Warning]:', err)
        })
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown Firebase initialization failure'
    console.error('[EDUGENIE Firebase Init Error]:', errorMsg)
    configStatus.isConfigured = false
    configStatus.error = `Failed to initialize Firebase client SDK: ${errorMsg}`
  }
} else {
  // Developer notice (no secrets exposed)
  console.warn(
    '[EDUGENIE Auth]: Firebase client configuration is missing or incomplete.',
    'Required variables:',
    configStatus.missingKeys.join(', ')
  )
}

export {
  firebaseApp,
  firebaseConfig,
  authInstance as auth,
  googleProviderInstance as googleProvider,
  analyticsInstance as analytics,
}

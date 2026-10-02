/**
 * Firebase Authentication Error Translation Utility.
 *
 * Maps internal Firebase error codes to friendly, human-understandable messages.
 * Prevents stack trace leakage or exposing internal system details to end users.
 */

import { FirebaseError } from 'firebase/app'

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown authentication error occurred. Please try again.'
  }

  // Handle FirebaseError instance
  if (error instanceof FirebaseError || (typeof error === 'object' && 'code' in error)) {
    const code = (error as { code: string }).code

    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'

      case 'auth/user-not-found':
        return 'No account found with this email address. Please sign up or check for typos.'

      case 'auth/wrong-password':
        return 'Incorrect password. Please verify your password or use "Forgot password?".'

      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.'

      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.'

      case 'auth/weak-password':
        return 'Password is too weak. Please choose a password with at least 6 characters.'

      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed before completing Google authentication.'

      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'

      case 'auth/cancelled-popup-request':
        return 'Only one sign-in window can be open at a time.'

      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection and try again.'

      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Access has been temporarily paused for your security. Please try again later.'

      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method. Please sign in using your original method.'

      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different user account.'

      case 'auth/operation-not-allowed':
        return 'This sign-in method is not currently enabled in the Firebase project console.'

      case 'auth/unauthorized-domain':
        return 'This domain (localhost) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.'

      case 'auth/user-disabled':
        return 'This user account has been disabled. Please contact EduGenie support.'

      case 'auth/requires-recent-login':
        return 'This action requires recent authentication. Please sign in again to continue.'

      case 'auth/expired-action-code':
        return 'The action link or reset code has expired. Please request a new one.'

      case 'auth/invalid-action-code':
        return 'The action link is invalid or has already been used.'

      default:
        // Do not expose raw internal code or stack traces
        return 'Unable to complete authentication. Please verify your details and try again.'
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
      return 'Network connection error. Please check your network and try again.'
    }
    // Never expose raw internal messages or stack traces
    return 'An unexpected authentication error occurred. Please try again.'
  }

  return 'An unexpected error occurred. Please try again.'
}

import { createContext } from 'react'
import type { User, UserCredential } from 'firebase/auth'

export interface AuthContextType {
  currentUser: User | null
  loading: boolean
  isConfigured: boolean
  configError: string | null
  authError: string | null
  clearError: () => void
  signIn: (email: string, password: string) => Promise<UserCredential>
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>
  signInWithGoogle: () => Promise<UserCredential | void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

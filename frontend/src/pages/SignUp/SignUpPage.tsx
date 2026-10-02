import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AppLogo } from '../../components/branding/AppLogo'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FirebaseConfigNotice } from '../../components/auth/FirebaseConfigNotice'

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp, signInWithGoogle, isConfigured } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'signup' | 'google' | null>(null)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  // Target route to return to post-auth
  const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'

  const validateForm = (): boolean => {
    let isValid = true
    setNameError('')
    setEmailError('')
    setPasswordError('')
    setConfirmPasswordError('')
    setFormError(null)

    if (!name.trim()) {
      setNameError('Full name is required')
      isValid = false
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError('Email address is required')
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      isValid = false
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password')
      isValid = false
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double-click race condition
    if (loadingAction) return

    if (!validateForm()) return

    if (!isConfigured) {
      setFormError('Firebase client is not configured. Please define credentials in your .env file.')
      return
    }

    setLoadingAction('signup')
    try {
      await signUp(email, password, name)
      setRegisteredSuccess(true)
      // Navigate to dashboard after short delay or let user acknowledge verification
      setTimeout(() => {
        navigate(destination, { replace: true })
      }, 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create account. Please try again.'
      setFormError(msg)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleGoogleSignIn = async () => {
    if (loadingAction) return

    if (!isConfigured) {
      setFormError('Firebase client is not configured. Please define credentials in your .env file.')
      return
    }

    setLoadingAction('google')
    setFormError(null)

    try {
      await signInWithGoogle()
      navigate(destination, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed. Please try again.'
      setFormError(msg)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--space-4)',
        background: 'radial-gradient(circle at 50% 15%, rgba(79, 70, 229, 0.1) 0%, transparent 60%), var(--color-bg-base)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8) var(--space-6)',
          boxShadow: 'var(--shadow-lg)',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'inline-flex', marginBottom: 'var(--space-4)' }}>
            <AppLogo size="lg" showText={false} />
          </div>
          <h2
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.03em',
              margin: '0 0 var(--space-1) 0',
            }}
          >
            Create account
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Start your personalized learning journey with EduGenie.
          </p>
        </div>

        {/* Configuration Notice if Firebase environment variables are missing */}
        <FirebaseConfigNotice />

        {/* Form Error Banner */}
        {formError && (
          <div
            id="signup-error-banner"
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-danger)',
              lineHeight: 1.5,
            }}
          >
            ⚠️ {formError}
          </div>
        )}

        {/* Post-Registration Verification Notice */}
        {registeredSuccess && (
          <div
            id="signup-success-banner"
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-success)',
              lineHeight: 1.5,
            }}
          >
            <strong>Account created successfully!</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              A verification link was dispatched to <strong>{email}</strong>. Redirecting you to your learning dashboard...
            </p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="signup-name"
            label="Full Name"
            type="text"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            autoComplete="name"
            disabled={loadingAction !== null}
          />

          <Input
            id="signup-email"
            label="Email Address"
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            autoComplete="email"
            disabled={loadingAction !== null}
          />

          <Input
            id="signup-password"
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            autoComplete="new-password"
            disabled={loadingAction !== null}
          />

          <Input
            id="signup-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPasswordError}
            autoComplete="new-password"
            disabled={loadingAction !== null}
          />

          <div style={{ marginTop: 'var(--space-5)' }}>
            <Button
              id="btn-create-account"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loadingAction !== null}
            >
              {loadingAction === 'signup' ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            margin: 'var(--space-6) 0',
            color: 'var(--text-dim)',
            fontSize: 'var(--text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Continue with Google Button */}
        <Button
          id="btn-google-sign-up"
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          disabled={loadingAction !== null}
          onClick={handleGoogleSignIn}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          }
        >
          {loadingAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
        </Button>

        {/* Links */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              id="link-go-to-signin"
              style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
        <Link
          to="/dashboard"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textDecoration: 'none' }}
        >
          ← Return to Dashboard
        </Link>
      </div>
    </div>
  )
}

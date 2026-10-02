import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const { resetPassword, isConfigured } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('')
      setEmailError('')
      setSuccessMessage(null)
      setFormError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setFormError(null)

    if (!isConfigured) {
      setFormError('Firebase Authentication credentials are not configured. Please check .env.')
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setEmailError('Email address is required')
      return
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(trimmedEmail)
      // Safe generic message — does not reveal whether account exists
      setSuccessMessage(
        'If an EduGenie account matches this email, a password reset link has been dispatched. Please check your inbox and spam folder.'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to dispatch reset email. Please try again.'
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose()
      }}
    >
      <div
        id="modal-forgot-password"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-xl)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}
          >
            Reset Your Password
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {successMessage ? (
          <div>
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-5)',
              }}
            >
              ✓ {successMessage}
            </div>
            <Button
              id="btn-close-reset-modal"
              type="button"
              variant="primary"
              fullWidth
              onClick={handleClose}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                margin: '0 0 var(--space-4) 0',
              }}
            >
              Enter the email address linked to your account. We will send you a secure link to reset your password.
            </p>

            {formError && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--text-xs)',
                  lineHeight: 1.4,
                  marginBottom: 'var(--space-4)',
                }}
              >
                {formError}
              </div>
            )}

            <Input
              id="reset-email"
              label="Account Email"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              autoComplete="email"
              disabled={isSubmitting}
            />

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-5)',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                id="btn-submit-reset-email"
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                style={{ flex: 2 }}
              >
                {isSubmitting ? 'Sending reset email...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

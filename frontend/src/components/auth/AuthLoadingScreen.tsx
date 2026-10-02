import React from 'react'
import { AppLogo } from '../branding/AppLogo'

interface AuthLoadingScreenProps {
  message?: string
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = () => {
  return (
    <div
      id="auth-loading-screen"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        background: '#0D0F12',
        color: '#FFFFFF',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          maxWidth: '360px',
          textAlign: 'center',
        }}
      >
        <AppLogo size="lg" showText={true} />
      </div>
    </div>
  )
}

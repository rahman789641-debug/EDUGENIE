import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { AppLogo } from '../branding/AppLogo'

interface TopHeaderProps {
  pageTitle: string
  onToggleMobileMenu: () => void
  backendConnected?: boolean | null
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  onToggleMobileMenu,
  backendConnected = true,
}) => {
  // Theme state synced with localStorage and custom events
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('edugenie_theme') as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      localStorage.setItem('edugenie_theme', nextTheme)
      document.documentElement.setAttribute('data-theme', nextTheme)
      window.dispatchEvent(new CustomEvent('edugenie-theme-changed', { detail: nextTheme }))
    } catch (e) {
      console.error('Failed to toggle theme:', e)
    }
  }

  useEffect(() => {
    const handleThemeSync = (e: any) => {
      if (e.detail && (e.detail === 'dark' || e.detail === 'light')) {
        setTheme(e.detail)
      }
    }
    window.addEventListener('edugenie-theme-changed', handleThemeSync)
    return () => window.removeEventListener('edugenie-theme-changed', handleThemeSync)
  }, [])

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation sidebar"
          id="btn-mobile-nav"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <AppLogo size="sm" showText={false} />
        </Link>

        <h1
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--text-main)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {pageTitle}
        </h1>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Backend health status badge */}
        <div
          id="header-health-status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background:
              backendConnected === true
                ? 'var(--color-success-bg)'
                : backendConnected === false
                ? 'var(--color-danger-bg)'
                : 'var(--color-warning-bg)',
            color:
              backendConnected === true
                ? 'var(--color-success)'
                : backendConnected === false
                ? 'var(--color-danger)'
                : 'var(--color-warning)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
          />
          <span>{backendConnected ? 'API Ready' : 'Connecting...'}</span>
        </div>

        {/* Theme Toggle Button - Single Button straight to the right of API Ready */}
        <button
          type="button"
          id="btn-header-theme-toggle"
          className="header-theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Moon size={15} className="header-theme-icon moon" />
              <span className="header-theme-text">Dark Theme</span>
            </>
          ) : (
            <>
              <Sun size={15} className="header-theme-icon sun" />
              <span className="header-theme-text">Light Theme</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}

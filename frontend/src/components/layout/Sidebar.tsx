import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  Trash2,
  Settings,
  LogOut,
  ChevronDown,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import { AppLogo } from '../branding/AppLogo'
import { useAuth } from '../../hooks/useAuth'
import { historyApi } from '../../api/history'
import type { LearningActivityItem } from '../../types/history'
import {
  deleteChatSession,
  getAllSessionsAsActivities,
  isChatDeleted,
  markChatAsDeleted,
} from '../../utils/chatStorage'

interface SidebarProps {
  isMobileOpen: boolean
  onCloseMobile: () => void
}

interface SidebarLinkItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
}

const NAV_ITEMS: SidebarLinkItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'ask',
    label: 'Ask AI',
    path: '/ask',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'explain',
    label: 'Explain',
    path: '/explain',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="10" y1="22" x2="14" y2="22" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    ),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    path: '/quiz',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'summary',
    label: 'Summarize',
    path: '/summary',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="15" y1="12" x2="3" y2="12" />
        <line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
  },
  {
    id: 'learn',
    label: 'Learning Path',
    path: '/learn',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    id: 'research',
    label: 'Web Research',
    path: '/research',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    path: '/history',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="3" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, signOut } = useAuth()

  // History Accordion State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<LearningActivityItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null)

  // Profile Popover State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [avatarImgError, setAvatarImgError] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const fetchHistoryItems = useCallback(async () => {
    // 1. Immediately load local chat sessions (0ms instant display, filtered for non-deleted)
    const localActivities = getAllSessionsAsActivities(currentUser?.uid).filter(
      (item) => !isChatDeleted(item.id, item.title, item.input_snippet),
    )
    if (localActivities.length > 0) {
      setHistoryItems(localActivities)
    }

    setIsLoadingHistory(true)
    try {
      // 2. Fetch strictly QA chat activities from backend
      let backendItems: LearningActivityItem[] = []
      try {
        const res = await historyApi.getHistory({ activity_type: 'qa', page_size: 50 })
        if (res && res.items) {
          backendItems = res.items.filter((item) => {
            if (item.activity_type !== 'qa') return false
            if (isChatDeleted(item.id, item.title, item.input_snippet)) return false
            return true
          })
        }
      } catch (backendErr) {
        console.warn('Backend history fetch unavailable or unauthenticated, falling back to local sessions', backendErr)
      }

      // 3. Deduplicate and merge by normalized title / question
      const seenTitles = new Set<string>()
      const merged: LearningActivityItem[] = []

      // Prioritize local activities first (they have the freshest immediate turns)
      for (const item of localActivities) {
        if (isChatDeleted(item.id, item.title, item.input_snippet)) continue
        const key = (item.title || item.input_snippet || '').trim().toLowerCase()
        if (key && !seenTitles.has(key)) {
          seenTitles.add(key)
          merged.push(item)
        }
      }

      // Append backend items if not already present and not deleted
      for (const item of backendItems) {
        if (isChatDeleted(item.id, item.title, item.input_snippet)) continue
        const key = (item.title || item.input_snippet || '').trim().toLowerCase()
        if (key && !seenTitles.has(key)) {
          seenTitles.add(key)
          merged.push(item)
        }
      }

      // Sort newest at the top
      merged.sort((a, b) => {
        const tA = new Date(a.created_at).getTime() || 0
        const tB = new Date(b.created_at).getTime() || 0
        return tB - tA
      })

      setHistoryItems(merged)
    } catch (err) {
      console.error('Failed to load chat history', err)
      if (localActivities.length > 0) {
        setHistoryItems(localActivities)
      }
    } finally {
      setIsLoadingHistory(false)
    }
  }, [currentUser?.uid])

  // Listen for real-time chat updates, chat deletions, and window storage events
  useEffect(() => {
    fetchHistoryItems()

    const onHistoryUpdated = () => {
      fetchHistoryItems()
    }

    window.addEventListener('edugenie-history-updated', onHistoryUpdated)
    window.addEventListener('edugenie-chat-deleted', onHistoryUpdated)
    window.addEventListener('storage', onHistoryUpdated)

    return () => {
      window.removeEventListener('edugenie-history-updated', onHistoryUpdated)
      window.removeEventListener('edugenie-chat-deleted', onHistoryUpdated)
      window.removeEventListener('storage', onHistoryUpdated)
    }
  }, [fetchHistoryItems])

  const toggleHistory = () => {
    const next = !isHistoryOpen
    setIsHistoryOpen(next)
    if (next) {
      fetchHistoryItems()
    }
  }

  const handleDeleteHistory = async (e: React.MouseEvent, chatItem: LearningActivityItem) => {
    e.preventDefault()
    e.stopPropagation()
    const id = chatItem.id
    const title = chatItem.title || ''
    const question = (chatItem.metadata?.question as string) || chatItem.input_snippet || title
    setDeletingHistoryId(id)

    try {
      // 1. Permanently blacklist in localStorage so it can never reappear
      markChatAsDeleted(id, title, question)

      // 2. Delete from local storage
      deleteChatSession(id, title, question)

      // 3. Immediately update UI state
      setHistoryItems((prev) =>
        prev.filter((item) => !isChatDeleted(item.id, item.title, item.input_snippet)),
      )

      // 4. Notify all components and tabs
      window.dispatchEvent(
        new CustomEvent('edugenie-chat-deleted', {
          detail: { id, title, question },
        }),
      )
      window.dispatchEvent(new CustomEvent('edugenie-history-updated'))

      // 5. Delete from backend database:
      // If it's a backend ID, delete directly
      if (id.startsWith('act-')) {
        await historyApi.deleteHistoryItem(id).catch(() => {})
      } else {
        // If it was a local session, find any matching backend activities and delete them too
        try {
          const res = await historyApi.getHistory({ activity_type: 'qa', page_size: 50 })
          if (res && res.items) {
            const normTitle = title.trim().toLowerCase()
            const normQ = question.trim().toLowerCase()
            for (const bItem of res.items) {
              const bTitle = (bItem.title || '').trim().toLowerCase()
              const bQ = ((bItem.metadata?.question as string) || bItem.input_snippet || '').trim().toLowerCase()
              if (bTitle === normTitle || bTitle === normQ || bQ === normTitle || bQ === normQ) {
                await historyApi.deleteHistoryItem(bItem.id).catch(() => {})
              }
            }
          }
        } catch {
          // Ignore backend lookup errors
        }
      }
    } catch (err) {
      console.error('Failed to delete history item', err)
    } finally {
      setDeletingHistoryId(null)
    }
  }

  const handleSelectHistoryItem = (item: LearningActivityItem) => {
    onCloseMobile()
    const question = (item.metadata?.question as string) || item.title || item.input_snippet || ''
    const answer = (item.metadata?.answer as string) || item.output_snippet || ''
    const mode = (item.metadata?.mode as string) || (item.activity_type === 'research' ? 'research' : 'ai')

    navigate(`/ask?chatId=${encodeURIComponent(item.id)}`, {
      state: {
        chatId: item.id,
        title: item.title,
        question,
        answer,
        mode,
        createdAt: item.created_at,
      },
    })
  }

  // Handle clicking outside profile popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen])

  const handleNavigateSettings = () => {
    setIsProfileMenuOpen(false)
    onCloseMobile()
    navigate('/settings')
  }

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false)
    onCloseMobile()
    try {
      await signOut()
    } catch {
      navigate('/login', { replace: true })
    }
  }

  const isHistoryActive = location.pathname === '/history'

  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        className={`mobile-backdrop ${isMobileOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Main navigation sidebar */}
      <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-header">
          <Link to="/dashboard" onClick={onCloseMobile} style={{ textDecoration: 'none' }}>
            <AppLogo size="md" showText showTagline={false} />
          </Link>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core Capabilities</div>
          {NAV_ITEMS.map((item) => {
            if (item.id === 'history') {
              return (
                <div key={item.id} className="sidebar-history-wrapper">
                  <button
                    type="button"
                    id={`nav-link-${item.id}`}
                    className={`nav-link sidebar-history-trigger ${isHistoryActive ? 'active' : ''}`}
                    onClick={toggleHistory}
                    aria-expanded={isHistoryOpen}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className="history-chevron"
                      style={{
                        transform: isHistoryOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>

                  {/* Inline expandable history dropdown */}
                  {isHistoryOpen && (
                    <div className="sidebar-history-dropdown">
                      {isLoadingHistory ? (
                        <div className="sidebar-history-loading">
                          <Loader2 size={13} className="spin" />
                          <span>Loading chats...</span>
                        </div>
                      ) : historyItems.length === 0 ? (
                        <div className="sidebar-history-empty">
                          <span>No AI chats yet</span>
                        </div>
                      ) : (
                        historyItems.map((chat) => (
                          <div
                            key={chat.id}
                            className="sidebar-history-item"
                            onClick={() => handleSelectHistoryItem(chat)}
                            title={chat.title}
                          >
                            <span className="sidebar-history-icon">
                              <MessageSquare size={13} />
                            </span>
                            <span className="sidebar-history-title">{chat.title}</span>
                            <button
                              type="button"
                              className="sidebar-history-delete-btn"
                              onClick={(e) => handleDeleteHistory(e, chat)}
                              disabled={deletingHistoryId === chat.id}
                              title="Delete chat session"
                              aria-label="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}

                      <Link
                        to="/history"
                        className="sidebar-history-view-all"
                        onClick={onCloseMobile}
                      >
                        View all in History →
                      </Link>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={item.id}
                to={item.path}
                id={`nav-link-${item.id}`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          {currentUser ? (
            <div className="sidebar-user-profile-wrapper" ref={profileMenuRef}>
              {/* Profile popup menu opening upwards */}
              {isProfileMenuOpen && (
                <div className="sidebar-profile-dropdown" role="menu" aria-label="User Account Menu">
                  <div className="sidebar-profile-dropdown-header">
                    <div className="sidebar-profile-dropdown-user">
                      <span className="sidebar-profile-dropdown-name">
                        {currentUser.displayName || currentUser.email?.split('@')[0] || 'Learner'}
                      </span>
                      <span className="sidebar-profile-dropdown-email">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>

                  <div className="sidebar-profile-dropdown-divider" />

                  {/* Settings */}
                  <button
                    type="button"
                    className="sidebar-profile-dropdown-item"
                    onClick={handleNavigateSettings}
                    id="btn-sidebar-profile-settings"
                  >
                    <Settings size={15} />
                    <span>Settings</span>
                  </button>

                  {/* Sign Out */}
                  <button
                    type="button"
                    className="sidebar-profile-dropdown-item danger"
                    onClick={handleSignOut}
                    id="btn-sidebar-profile-logout"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              {/* User Profile Card Button */}
              <button
                type="button"
                id="btn-sidebar-user-profile"
                className={`sidebar-user-profile-btn ${isProfileMenuOpen ? 'active' : ''}`}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
              >
                <div className="sidebar-user-avatar-container">
                  {currentUser.photoURL && !avatarImgError ? (
                    <img
                      src={currentUser.photoURL}
                      alt=""
                      className="sidebar-user-avatar-img"
                      onError={() => setAvatarImgError(true)}
                    />
                  ) : (
                    <div className="sidebar-user-avatar-fallback">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="sidebar-user-status-dot" />
                </div>

                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="sidebar-user-email">
                    {currentUser.email}
                  </span>
                </div>

                <MoreHorizontal size={16} className="sidebar-user-more-icon" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="sidebar-signin-link"
              onClick={onCloseMobile}
            >
              Sign In
            </Link>
          )}

          <div className="sidebar-footer-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--color-accent-cyan)', fontSize: '13px' }}>✦</span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-main)' }}>
                Gemini Architecture
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
              Production foundation configured with Pydantic & React 19.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

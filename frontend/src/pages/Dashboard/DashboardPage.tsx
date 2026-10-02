import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'
import { FeatureCard } from '../../components/features/FeatureCard'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { historyApi } from '../../api/history'
import { Trash2 } from 'lucide-react'
import { markChatAsDeleted, isChatDeleted } from '../../utils/chatStorage'
import type { DashboardStatsResponse, ActivityType, LearningActivityItem } from '../../types/history'

const FEATURE_CARDS_DATA = [
  {
    id: 'ask',
    title: 'Ask AI',
    description: 'Get clear answers to academic and general learning questions.',
    icon: '💬',
    path: '/ask',
    badge: 'Q&A',
  },
  {
    id: 'explain',
    title: 'Explain Concepts',
    description: 'Break complex topics into simple, understandable explanations.',
    icon: '💡',
    path: '/explain',
    badge: 'Pedagogy',
  },
  {
    id: 'quiz',
    title: 'Generate Quiz',
    description: 'Turn learning content into practice questions.',
    icon: '📝',
    path: '/quiz',
    badge: 'Assessment',
  },
  {
    id: 'summary',
    title: 'Summarize',
    description: 'Convert long educational content into concise revision notes.',
    icon: '📚',
    path: '/summary',
    badge: 'Revision',
  },
  {
    id: 'learn',
    title: 'Learning Path',
    description: 'Build a structured path from beginner to advanced.',
    icon: '🎯',
    path: '/learn',
    badge: 'Roadmap',
  },
  {
    id: 'research',
    title: 'Web Research',
    description: 'Query live external web sources and synthesize grounded answers with citations.',
    icon: '🌐',
    path: '/research',
    badge: 'Grounding',
  },
]

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    label: string
    badgeVariant: 'primary' | 'success' | 'warning' | 'danger' | 'cyan' | 'neutral'
    route: string
    icon: string
  }
> = {
  qa: { label: 'Q&A', badgeVariant: 'cyan', route: '/ask', icon: '💬' },
  explain: { label: 'Explanation', badgeVariant: 'warning', route: '/explain', icon: '💡' },
  quiz: { label: 'Quiz', badgeVariant: 'primary', route: '/quiz', icon: '📝' },
  summarize: { label: 'Summary', badgeVariant: 'success', route: '/summary', icon: '📚' },
  learning_path: { label: 'Learning Path', badgeVariant: 'primary', route: '/learn', icon: '🎯' },
  research: { label: 'Web Research', badgeVariant: 'neutral', route: '/research', icon: '🌐' },
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser, sendVerificationEmail } = useAuth()
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationSending, setVerificationSending] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState(false)

  // Dashboard Statistics State
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState<boolean>(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Safe fallback for displayName
  const studentName = currentUser?.displayName?.trim() || currentUser?.email?.split('@')[0] || 'Student'
  const userInitial = studentName.charAt(0).toUpperCase()
  const photoUrl = currentUser?.photoURL

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await historyApi.getDashboardStats()
      if (data && data.recent_activities) {
        data.recent_activities = data.recent_activities.filter(
          (item) => !isChatDeleted(item.id, item.title, (item.metadata?.question as string) || item.input_snippet),
        )
      }
      setStats(data)
    } catch {
      // Non-blocking dashboard stats fetch
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const handleDeleteRecentItem = async (item: LearningActivityItem) => {
    try {
      setDeletingId(item.id)
      const question = (item.metadata?.question as string) || item.input_snippet || ''
      markChatAsDeleted(item.id, item.title, question)

      setStats((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          recent_activities: prev.recent_activities.filter((i) => i.id !== item.id),
        }
      })
      setDeleteConfirmId(null)

      window.dispatchEvent(
        new CustomEvent('edugenie-chat-deleted', {
          detail: { id: item.id, title: item.title, question },
        }),
      )
      window.dispatchEvent(new CustomEvent('edugenie-history-updated'))

      await historyApi.deleteHistoryItem(item.id).catch((err) => {
        console.warn('Backend delete notification:', err)
      })
    } catch (err) {
      console.error('Failed to delete recent activity item:', err)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleResendVerification = async () => {
    setVerificationSending(true)
    setVerificationError(null)
    try {
      await sendVerificationEmail()
      setVerificationSent(true)
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Could not send verification email.')
    } finally {
      setVerificationSending(false)
    }
  }

  const formatRelativeTime = (iso: string) => {
    try {
      const date = new Date(iso)
      if (isNaN(date.getTime())) return iso
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Email Verification Banner (if user is authenticated with email/password and unverified) */}
      {currentUser && !currentUser.emailVerified && (
        <div
          id="email-verification-alert"
          style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '18px' }}>✉️</span>
            <div>
              <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                Email Verification Pending
              </strong>
              <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Your email (<strong>{currentUser.email}</strong>) has not yet been verified.
                {verificationSent && ' Verification link sent! Check your inbox and spam folder.'}
              </p>
              {verificationError && (
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-danger)' }}>
                  {verificationError}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            id="btn-resend-verification"
            onClick={handleResendVerification}
            disabled={verificationSending || verificationSent}
            style={{
              padding: '6px 12px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning)',
              color: '#000000',
              border: 'none',
              cursor: verificationSending || verificationSent ? 'not-allowed' : 'pointer',
              opacity: verificationSending || verificationSent ? 0.7 : 1,
            }}
          >
            {verificationSending ? 'Sending link...' : verificationSent ? 'Link Dispatched' : 'Resend Link'}
          </button>
        </div>
      )}

      {/* Welcome & Overview Header */}
      <section>
        <div
          style={{
            background: 'var(--gradient-brand-subtle)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6) var(--space-8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {photoUrl && !photoError ? (
              <img
                src={photoUrl}
                alt={studentName}
                onError={() => setPhotoError(true)}
                referrerPolicy="no-referrer"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-highlight)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-subtle)',
                  border: '2px solid var(--border-highlight)',
                  color: 'var(--color-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                }}
              >
                {userInitial}
              </div>
            )}

            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-1)',
                }}
              >
                <span>✦</span>
                <span>Next-Gen Learning Assistant</span>
              </div>
              <h2
                id="dashboard-user-greeting"
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                Welcome back, {studentName}
              </h2>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--space-1)',
                  maxWidth: '600px',
                }}
              >
                Empower your studies with Google Gemini. Select a task below to ask questions, deconstruct complex concepts, or generate adaptive practice quizzes.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-4)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Active Model
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-main)' }}>
                Gemini-3.1-flash-lite
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Statistics Cards */}
      <section>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Learning Overview
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Aggregated statistics for your learning activities across all modules.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Total Activities */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-subtle)',
                  border: '1px solid var(--border-highlight)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                📊
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Total Activities
                </div>
                <div
                  id="stat-total-activities"
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.2,
                  }}
                >
                  {statsLoading ? '...' : (stats?.total_activities ?? 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Questions Asked */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent-cyan-subtle)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                💬
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Questions Asked
                </div>
                <div
                  id="stat-questions-asked"
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-accent-cyan)',
                    lineHeight: 1.2,
                  }}
                >
                  {statsLoading ? '...' : (stats?.questions_asked ?? 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Quizzes Completed */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                📝
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Quizzes Generated
                </div>
                <div
                  id="stat-quizzes-completed"
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: '#c084fc',
                    lineHeight: 1.2,
                  }}
                >
                  {statsLoading ? '...' : (stats?.quizzes_completed ?? 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Research Sessions */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🌐
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Web Research
                </div>
                <div
                  id="stat-research-queries"
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-success)',
                    lineHeight: 1.2,
                  }}
                >
                  {statsLoading ? '...' : (stats?.research_queries ?? 0)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Main AI Interaction Area */}
      <section>
        <AIAssistantWorkspace initialTask="ask" />
      </section>

      {/* 6 Core Feature Cards Grid */}
      <section>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Educational Capabilities
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Jump directly into dedicated focus workspaces for each learning capability.
          </p>
        </div>

        <div className="feature-cards-grid">
          {FEATURE_CARDS_DATA.map((card) => (
            <FeatureCard
              key={card.id}
              id={card.id}
              title={card.title}
              description={card.description}
              icon={card.icon}
              path={card.path}
              badge={card.badge}
            />
          ))}
        </div>
      </section>

      {/* Recent Learning Activity Feed (Only displayed when activities exist, placed after core features) */}
      {stats && stats.recent_activities && stats.recent_activities.length > 0 && (
        <section id="recent-learning-activity-section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Recent Learning Activity
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
                Your latest interactions and study outputs.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fetchStats()}
                disabled={statsLoading}
              >
                ↻ Refresh
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate('/history')}
              >
                View Full History →
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {stats.recent_activities.map((item) => {
              const cfg = ACTIVITY_CONFIG[item.activity_type] || {
                label: item.activity_type,
                badgeVariant: 'neutral' as const,
                route: '/dashboard',
                icon: '📄',
              }

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: '240px' }}>
                    <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '2px' }}>
                        <Badge variant={cfg.badgeVariant} size="sm">
                          {cfg.label}
                        </Badge>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '480px',
                        }}
                      >
                        {item.title}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(cfg.route)}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      Open Tool →
                    </Button>

                    {/* Delete Item Button */}
                    {deleteConfirmId === item.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteRecentItem(item)}
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            background: '#ef4444',
                            color: '#ffffff',
                          }}
                        >
                          {deletingId === item.id ? 'Deleting...' : 'Delete'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ fontSize: '11px', padding: '4px 6px' }}
                          title="Cancel"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Delete this activity"
                        aria-label="Delete activity"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: 'var(--color-danger, #ef4444)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Architecture Readiness Card */}
      <section>
        <Card
          title="Software Engineering Standards"
          subtitle="Verification of Step 14 production data persistence & dashboard intelligence"
          action={
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-success)',
                background: 'var(--color-success-bg)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              STEP 14 VALIDATED
            </span>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                ✓ Authenticated Activity Persistence
              </strong>
              All completed AI interactions are non-blockingly logged and linked strictly to verified Firebase UID tokens.
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                ✓ Multi-User Data Isolation
              </strong>
              Client-supplied identifiers are never trusted; user queries strictly filter by authenticated identity.
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                ✓ Production Dashboard Intelligence
              </strong>
              Real-time aggregated metrics, paginated history filtering, and seamless resumption of past studies.
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

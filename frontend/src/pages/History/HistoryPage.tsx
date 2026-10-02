import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { historyApi } from '../../api/history'
import { Trash2 } from 'lucide-react'
import { markChatAsDeleted, isChatDeleted } from '../../utils/chatStorage'
import type { ActivityType, LearningActivityItem } from '../../types/history'

interface FilterTab {
  id: ActivityType | 'all'
  label: string
  icon: string
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All Activities', icon: '📋' },
  { id: 'qa', label: 'Q&A', icon: '💬' },
  { id: 'explain', label: 'Explanations', icon: '💡' },
  { id: 'quiz', label: 'Quizzes', icon: '📝' },
  { id: 'summarize', label: 'Summaries', icon: '📚' },
  { id: 'learning_path', label: 'Learning Paths', icon: '🎯' },
  { id: 'research', label: 'Web Research', icon: '🌐' },
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

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedFilter, setSelectedFilter] = useState<ActivityType | 'all'>('all')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LearningActivityItem[]>([])
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await historyApi.getHistory({
        page,
        page_size: pageSize,
        activity_type: selectedFilter === 'all' ? undefined : selectedFilter,
      })
      const activeItems = (resp.items || []).filter(
        (item) => !isChatDeleted(item.id, item.title, (item.metadata?.question as string) || item.input_snippet),
      )
      setItems(activeItems)
      setTotal(resp.total || 0)
      setTotalPages(resp.total_pages || 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load activity history'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [page, selectedFilter])

  const handleDeleteItem = async (item: LearningActivityItem) => {
    try {
      setDeletingId(item.id)

      // 1. Mark as deleted in persistent blacklist
      const question = (item.metadata?.question as string) || item.input_snippet || ''
      markChatAsDeleted(item.id, item.title, question)

      // 2. Optimistically remove from state
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setTotal((prev) => Math.max(0, prev - 1))
      setDeleteConfirmId(null)

      // 3. Notify sidebar and other components
      window.dispatchEvent(
        new CustomEvent('edugenie-chat-deleted', {
          detail: { id: item.id, title: item.title, question },
        }),
      )
      window.dispatchEvent(new CustomEvent('edugenie-history-updated'))

      // 4. Delete from backend persistence
      await historyApi.deleteHistoryItem(item.id).catch((err) => {
        console.warn('Backend delete notification:', err)
      })
    } catch (err) {
      console.error('Failed to delete history item:', err)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleFilterChange = (filterId: ActivityType | 'all') => {
    setSelectedFilter(filterId)
    setPage(1)
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso)
      if (isNaN(date.getTime())) return iso
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return iso
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h2
            id="history-page-heading"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Learning History
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-1)',
            }}
          >
            Track your verified learning sessions, review past interactions, and resume previous studies.
          </p>
        </div>

        <Button
          id="btn-refresh-history"
          variant="secondary"
          size="sm"
          onClick={() => fetchHistory()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </Button>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter activities by type"
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          paddingBottom: 'var(--space-2)',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = selectedFilter === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              id={`filter-tab-${tab.id}`}
              onClick={() => handleFilterChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: '1px solid',
                borderColor: isActive ? 'var(--color-primary)' : 'var(--border-subtle)',
                background: isActive ? 'var(--color-primary-subtle)' : 'var(--color-bg-subtle)',
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Retrieving your learning records..." />
      ) : error ? (
        <ErrorState
          title="Could not load history"
          message={error}
          onRetry={fetchHistory}
          retryText="Retry"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={selectedFilter === 'all' ? '📚' : ACTIVITY_CONFIG[selectedFilter as ActivityType]?.icon || '🔍'}
          title={selectedFilter === 'all' ? 'No learning activities yet' : `No ${selectedFilter} records found`}
          description={
            selectedFilter === 'all'
              ? 'Your completed Q&A sessions, concept explanations, quizzes, and research will be securely saved here.'
              : `You have not completed any ${selectedFilter} activities yet. Explore the feature to get started!`
          }
          action={
            selectedFilter === 'all' ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                <Button size="sm" onClick={() => navigate('/ask')}>
                  Ask AI
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/explain')}>
                  Explain Concept
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/quiz')}>
                  Take Quiz
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedFilter('all')}
              >
                View All Activities
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Activity Items List */}
          {items.map((item) => {
            const config = ACTIVITY_CONFIG[item.activity_type] || {
              label: item.activity_type,
              badgeVariant: 'neutral' as const,
              route: '/dashboard',
              icon: '📄',
            }
            const isExpanded = expandedIds.has(item.id)

            return (
              <Card key={item.id} className="history-item-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {/* Item Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Badge variant={config.badgeVariant} size="sm">
                        {config.icon} {config.label}
                      </Badge>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(item.id)}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        {isExpanded ? 'Collapse' : 'Details'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (item.activity_type === 'qa' || item.activity_type === 'research') {
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
                          } else {
                            navigate(config.route)
                          }
                        }}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Open Tool →
                      </Button>

                      {/* Delete History Item Button */}
                      {deleteConfirmId === item.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteItem(item)}
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
                          title="Delete this history record"
                          aria-label="Delete history record"
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

                  {/* Title / Topic */}
                  <h3
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      margin: 0,
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* Input Snippet */}
                  {item.input_snippet && (
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-2) var(--space-3)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-dim)' }}>Input: </strong>
                      {item.input_snippet}
                    </div>
                  )}

                  {/* Output Preview / Snippet */}
                  {item.output_snippet && (
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-main)',
                        lineHeight: 1.5,
                        maxHeight: isExpanded ? 'none' : '64px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {item.output_snippet}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({total} activities total)
              </span>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  id="btn-prev-page"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>
                <Button
                  id="btn-next-page"
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

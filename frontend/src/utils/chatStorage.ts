import type { ChatMessage, QAMode } from '../types/chat'
import type { LearningActivityItem } from '../types/history'

export interface StoredChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  mode: QAMode
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'edugenie_chat_sessions'
const DELETED_CHATS_KEY = 'edugenie_deleted_chats'
const MAX_SESSIONS = 50

/**
 * Retrieve persistent set of deleted chat IDs and normalized titles.
 */
export function getDeletedChatSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CHATS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((item) => String(item).trim().toLowerCase()))
    }
    return new Set()
  } catch (err) {
    console.error('[chatStorage] Failed to read deleted chats set', err)
    return new Set()
  }
}

/**
 * Mark a chat session as permanently deleted by its ID and normalized title/question.
 */
export function markChatAsDeleted(
  id: string,
  title?: string | null,
  question?: string | null,
): void {
  try {
    const deletedSet = getDeletedChatSet()
    if (id) deletedSet.add(id.trim().toLowerCase())
    if (title && title.trim()) deletedSet.add(title.trim().toLowerCase())
    if (question && question.trim()) deletedSet.add(question.trim().toLowerCase())

    localStorage.setItem(DELETED_CHATS_KEY, JSON.stringify(Array.from(deletedSet)))
  } catch (err) {
    console.error('[chatStorage] Failed to record deleted chat in blacklist', err)
  }
}

/**
 * Check if a chat session has been deleted.
 */
export function isChatDeleted(
  id: string,
  title?: string | null,
  question?: string | null,
): boolean {
  if (!id && !title && !question) return false
  const deletedSet = getDeletedChatSet()

  if (id && deletedSet.has(id.trim().toLowerCase())) return true
  if (title && deletedSet.has(title.trim().toLowerCase())) return true
  if (question && deletedSet.has(question.trim().toLowerCase())) return true

  return false
}

/**
 * Retrieve all persisted chat sessions from browser localStorage (excluding any deleted chats).
 */
export function getAllChatSessions(): StoredChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const deletedSet = getDeletedChatSet()
      return parsed.filter((s: StoredChatSession) => {
        if (!s || !s.id) return false
        const sId = s.id.trim().toLowerCase()
        const sTitle = (s.title || '').trim().toLowerCase()
        const firstQ = (s.messages?.find((m) => m.role === 'user')?.content || '').trim().toLowerCase()

        return !deletedSet.has(sId) && !deletedSet.has(sTitle) && (!firstQ || !deletedSet.has(firstQ))
      })
    }
    return []
  } catch (err) {
    console.error('[chatStorage] Failed to read sessions from localStorage', err)
    return []
  }
}

/**
 * Retrieve a single chat session by ID or fallback search (if not deleted).
 */
export function getChatSession(id: string): StoredChatSession | null {
  if (!id || isChatDeleted(id)) return null
  const sessions = getAllChatSessions()
  const exact = sessions.find((s) => s.id === id)
  if (exact && !isChatDeleted(exact.id, exact.title)) return exact

  // Fallback matching in case ID had prefix or suffix differences
  const matched = sessions.find((s) => s.id.includes(id) || id.includes(s.id))
  if (matched && !isChatDeleted(matched.id, matched.title)) return matched
  return null
}

/**
 * Save or update a chat session in browser localStorage.
 */
export function saveChatSession(session: StoredChatSession): void {
  if (!session || !session.id) return
  // Do not save if marked as deleted
  if (isChatDeleted(session.id, session.title)) return

  try {
    const sessions = getAllChatSessions()
    const index = sessions.findIndex((s) => s.id === session.id)
    let updated: StoredChatSession[]
    if (index >= 0) {
      updated = [...sessions]
      updated[index] = session
    } else {
      updated = [session, ...sessions]
    }
    // Cap at MAX_SESSIONS to prevent storage overflows
    if (updated.length > MAX_SESSIONS) {
      updated = updated.slice(0, MAX_SESSIONS)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('[chatStorage] Failed to save session to localStorage', err)
  }
}

/**
 * Permanently remove a chat session from localStorage and mark as deleted.
 */
export function deleteChatSession(
  id: string,
  title?: string | null,
  question?: string | null,
): void {
  try {
    markChatAsDeleted(id, title, question)

    const sessions = getAllChatSessions()
    const normTitle = (title || '').trim().toLowerCase()
    const normQ = (question || '').trim().toLowerCase()

    const updated = sessions.filter((s) => {
      const sId = s.id.trim().toLowerCase()
      const sTitle = (s.title || '').trim().toLowerCase()
      const firstQ = (s.messages?.find((m) => m.role === 'user')?.content || '').trim().toLowerCase()

      if (s.id === id || sId === id.trim().toLowerCase() || s.id.includes(id) || id.includes(s.id)) {
        return false
      }
      if (normTitle && sTitle === normTitle) return false
      if (normQ && (firstQ === normQ || sTitle === normQ)) return false
      return true
    })

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('[chatStorage] Failed to delete session from localStorage', err)
  }
}

/**
 * Find session by user query/question snippet.
 */
export function findSessionByQuery(queryText: string): StoredChatSession | null {
  if (!queryText || !queryText.trim()) return null
  const norm = queryText.trim().toLowerCase()
  if (isChatDeleted(norm, norm)) return null

  const sessions = getAllChatSessions()
  return (
    sessions.find(
      (s) =>
        !isChatDeleted(s.id, s.title) &&
        (s.title.toLowerCase().includes(norm) ||
          s.messages.some((m) => m.content.toLowerCase().includes(norm))),
    ) || null
  )
}

/**
 * Convert StoredChatSession to LearningActivityItem so the sidebar and history view can render seamlessly.
 */
export function sessionToActivityItem(
  session: StoredChatSession,
  userId?: string,
): LearningActivityItem {
  const userMsg = session.messages.find((m) => m.role === 'user')
  const aiMsg = session.messages.find((m) => m.role === 'assistant')
  const question = userMsg?.content || session.title
  const answer = aiMsg?.content || ''

  return {
    id: session.id,
    user_id: userId || 'local-user',
    activity_type: 'qa',
    title: session.title,
    input_snippet: question,
    output_snippet: answer || null,
    metadata: {
      question,
      answer,
      mode: session.mode || 'ai',
      sources: aiMsg?.sources || [],
    },
    created_at: session.createdAt || session.updatedAt || new Date().toISOString(),
  }
}

/**
 * Retrieve all local chat sessions mapped as LearningActivityItem list.
 */
export function getAllSessionsAsActivities(userId?: string): LearningActivityItem[] {
  const sessions = getAllChatSessions()
  return sessions.map((s) => sessionToActivityItem(s, userId))
}

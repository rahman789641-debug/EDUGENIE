/**
 * Chat Message and Educational Assistant Types.
 * Strictly typed models without secrets or 'any'.
 */

import type { WebSource } from './research'

export type ChatRole = 'user' | 'assistant'

export type QAMode = 'ai' | 'research'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  model?: string
  requestId?: string
  mode?: QAMode
  sources?: WebSource[]
}

export type ChatStatus = 'idle' | 'loading' | 'error'

export interface AskQuestionPayload {
  question: string
  context?: string | null
  mode?: QAMode
}

export interface AskQuestionResult {
  status: string
  question: string
  answer: string
  mode?: QAMode
  sources: WebSource[]
  grounded: boolean
  model?: string
  request_id?: string
}

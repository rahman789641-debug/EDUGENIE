/**
 * Educational Q&A API Service with Dual AI & Web Research Modes.
 * Centralized service layer for communicating with POST /api/v1/qa.
 * Never leaks API keys, search tokens, stack traces, or internal error objects.
 */

import { apiClient, ApiError } from './client.ts'
import type { AskQuestionPayload, AskQuestionResult, QAMode } from '../types/chat'

export function sanitizeErrorMessage(err: unknown, mode: QAMode = 'ai'): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.code === 'SESSION_EXPIRED' || err.code === 'AUTHENTICATION_REQUIRED') {
      return 'Your session has expired. Please sign in again.'
    }
    if (err.status === 429 || err.code === 'AI_RATE_LIMITED' || err.code === 'RATE_LIMIT_EXCEEDED') {
      return 'EduGenie is currently busy helping many learners. Please wait a moment and try again.'
    }
    if (err.status === 504 || err.code === 'AI_TIMEOUT' || err.code === 'REQUEST_TIMEOUT') {
      return mode === 'research'
        ? 'Web research took longer than expected. Please try again.'
        : 'EduGenie took a bit too long to respond. Please try asking again.'
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return err.message || 'Please provide a clear educational question.'
    }
    if (err.status === 502 || err.status === 503 || err.code === 'AI_PROVIDER_ERROR') {
      return mode === 'research'
        ? 'Web research could not be completed. Please try again.'
        : 'AI answer could not be generated. Please try again.'
    }
    return err.message || (
      mode === 'research'
        ? 'Web research could not be completed. Please try again.'
        : 'AI answer could not be generated. Please try again.'
    )
  }

  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout')) {
      return mode === 'research'
        ? 'Web research took longer than expected. Please try again.'
        : 'EduGenie took a bit too long to respond. Please try asking again.'
    }
    if (err.message.toLowerCase().includes('network')) {
      return 'Network connection issue. Please check your internet and try again.'
    }
  }

  return mode === 'research'
    ? 'Web research could not be completed. Please try again.'
    : 'AI answer could not be generated. Please try again.'
}

export const qaApi = {
  /**
   * Submit an educational question to Gemini AI backend in either direct AI or Web Research mode.
   * Sends Authorization header with current user ID token via centralized apiClient.
   */
  async askQuestion(payload: AskQuestionPayload): Promise<AskQuestionResult> {
    const trimmedQuestion = payload.question.trim()
    if (!trimmedQuestion) {
      throw new Error('Please enter a question before sending.')
    }

    const mode: QAMode = payload.mode || 'ai'

    try {
      return await apiClient.post<AskQuestionResult>('/api/v1/qa', {
        question: trimmedQuestion,
        context: payload.context ? payload.context.trim() : null,
        mode,
      })
    } catch (err) {
      const friendlyMessage = sanitizeErrorMessage(err, mode)
      throw new Error(friendlyMessage)
    }
  },
}

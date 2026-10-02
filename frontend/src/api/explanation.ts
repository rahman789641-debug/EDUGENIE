/**
 * Concept Explanation API Service Client for EduGenie.
 * Connects directly to POST /api/v1/explain through centralized apiClient.
 * Never leaks API keys, Firebase tokens, Python paths, or stack traces.
 */

import { apiClient, ApiError } from './client.ts'
import type {
  ExplanationError,
  ExplanationLevel,
  ExplanationResponse,
} from '../types/explanation'

export function sanitizeExplanationError(err: unknown): ExplanationError {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.code === 'SESSION_EXPIRED' || err.code === 'AUTHENTICATION_REQUIRED') {
      return {
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please sign in again.',
        retryable: false,
      }
    }
    if (err.status === 429 || err.code === 'AI_RATE_LIMITED' || err.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        code: 'AI_RATE_LIMITED',
        message: 'EduGenie is currently receiving high demand. Please wait a moment and try again.',
        retryable: true,
      }
    }
    if (err.status === 504 || err.code === 'AI_TIMEOUT' || err.code === 'REQUEST_TIMEOUT') {
      return {
        code: 'AI_TIMEOUT',
        message: 'Generating your explanation took longer than expected. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Please enter a valid topic between 2 and 500 characters.',
        retryable: false,
      }
    }
    if (err.code === 'AI_GENERATION_ERROR') {
      return {
        code: 'AI_GENERATION_ERROR',
        message: 'EduGenie encountered an issue structuring the explanation. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 502 || err.status === 503 || err.code === 'AI_PROVIDER_ERROR') {
      return {
        code: 'AI_PROVIDER_ERROR',
        message: 'The AI service is momentarily unavailable. Please try again shortly.',
        retryable: true,
      }
    }
    return {
      code: err.code || 'UNKNOWN_SERVER_ERROR',
      message: err.message || 'Unable to generate explanation right now. Please try again.',
      retryable: true,
    }
  }

  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout')) {
      return {
        code: 'CLIENT_TIMEOUT',
        message: 'The request took too long to complete. Please try again.',
        retryable: true,
      }
    }
    if (err.message.toLowerCase().includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection issue. Please check your internet and try again.',
        retryable: true,
      }
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unable to generate explanation right now. Please try again.',
    retryable: true,
  }
}

export const explanationApi = {
  /**
   * Request a structured concept explanation at a designated learner level.
   */
  async explainConcept(
    topic: string,
    level: ExplanationLevel = 'beginner',
  ): Promise<ExplanationResponse> {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) {
      throw new Error('Please enter a topic before requesting an explanation.')
    }
    if (trimmedTopic.length < 2) {
      throw new Error('Topic must be at least 2 characters.')
    }
    if (trimmedTopic.length > 500) {
      throw new Error('Topic must not exceed 500 characters.')
    }

    try {
      return await apiClient.post<ExplanationResponse>('/api/v1/explain', {
        topic: trimmedTopic,
        level,
      })
    } catch (err) {
      const sanitized = sanitizeExplanationError(err)
      const errorWithCode = new Error(sanitized.message)
      ;(errorWithCode as unknown as { code: string }).code = sanitized.code
      throw errorWithCode
    }
  },
}

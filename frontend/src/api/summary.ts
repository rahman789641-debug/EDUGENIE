/**
 * Educational Summarization API Client for EduGenie.
 * Communicates with POST /api/v1/summarize through centralized apiClient.
 * Never leaks API keys, Firebase tokens, or stack traces.
 */

import { apiClient, ApiError } from './client.ts'
import type {
  SummaryLength,
  SummaryError,
  SummaryResponse,
} from '../types/summary'

export function sanitizeSummaryError(err: unknown): SummaryError {
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
        message: 'Summarization took longer than expected. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Please provide study material between 10 and 50,000 characters.',
        retryable: false,
      }
    }
    if (err.code === 'AI_GENERATION_ERROR') {
      return {
        code: 'AI_GENERATION_ERROR',
        message: 'EduGenie encountered an issue structuring the summary. Please try again.',
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
      message: err.message || 'Unable to generate summary right now. Please try again.',
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
    message: 'Unable to generate summary right now. Please try again.',
    retryable: true,
  }
}

export const summaryApi = {
  /**
   * Request a structured educational summary with key points from text.
   */
  async summarizeContent(
    content: string,
    length: SummaryLength = 'medium',
  ): Promise<SummaryResponse> {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      throw new Error('Please enter study material or a passage to summarize.')
    }
    if (trimmedContent.length < 10) {
      throw new Error('Content must be at least 10 characters long to summarize.')
    }
    if (trimmedContent.length > 50000) {
      throw new Error('Content must not exceed 50,000 characters.')
    }

    try {
      return await apiClient.post<SummaryResponse>('/api/v1/summarize', {
        content: trimmedContent,
        length,
      })
    } catch (err) {
      const sanitized = sanitizeSummaryError(err)
      const errorWithCode = new Error(sanitized.message)
      ;(errorWithCode as unknown as { code: string }).code = sanitized.code
      throw errorWithCode
    }
  },
}

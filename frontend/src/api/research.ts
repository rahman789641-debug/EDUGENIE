/**
 * Educational Web Research API Client for EduGenie.
 * Communicates with POST /api/v1/research through centralized apiClient.
 * Never leaks API keys, search tokens, Firebase credentials, or stack traces.
 */

import { apiClient, ApiError } from './client.ts'
import type {
  ResearchError,
  ResearchResponse,
} from '../types/research'

export function sanitizeResearchError(err: unknown): ResearchError {
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
        message: 'Web research and synthesis took longer than expected. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Please enter a research topic or question between 2 and 1,000 characters.',
        retryable: false,
      }
    }
    if (err.status === 502 || err.status === 503 || err.code === 'AI_PROVIDER_ERROR') {
      return {
        code: 'AI_PROVIDER_ERROR',
        message: 'The AI research service is momentarily unavailable. Please try again shortly.',
        retryable: true,
      }
    }
    return {
      code: err.code || 'UNKNOWN_SERVER_ERROR',
      message: err.message || 'Unable to complete web research right now. Please try again.',
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
    message: 'Unable to complete web research right now. Please try again.',
    retryable: true,
  }
}

export const researchApi = {
  /**
   * Submit an educational query for verified external web research and grounded synthesis.
   */
  async conductResearch(query: string): Promise<ResearchResponse> {
    const trimmed = query.trim()
    if (!trimmed) {
      throw new Error('Please enter a research question or topic.')
    }
    if (trimmed.length < 2) {
      throw new Error('Research query must be at least 2 characters.')
    }
    if (trimmed.length > 1000) {
      throw new Error('Research query must not exceed 1,000 characters.')
    }

    try {
      return await apiClient.post<ResearchResponse>('/api/v1/research', {
        query: trimmed,
      })
    } catch (err) {
      const sanitized = sanitizeResearchError(err)
      const errorWithCode = new Error(sanitized.message)
      ;(errorWithCode as unknown as { code: string }).code = sanitized.code
      throw errorWithCode
    }
  },
}

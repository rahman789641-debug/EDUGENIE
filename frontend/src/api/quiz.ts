/**
 * Quiz Generation API Client for EduGenie.
 * Communicates with POST /api/v1/quiz through centralized apiClient.
 * Never leaks API keys, Firebase tokens, or stack traces.
 */

import { apiClient, ApiError } from './client.ts'
import type {
  QuizDifficulty,
  QuizError,
  QuizResponse,
} from '../types/quiz'

export function sanitizeQuizError(err: unknown): QuizError {
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
        message: 'Quiz generation took longer than expected. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Please provide study material between 5 and 25,000 characters.',
        retryable: false,
      }
    }
    if (err.code === 'AI_GENERATION_ERROR') {
      return {
        code: 'AI_GENERATION_ERROR',
        message: 'EduGenie encountered an issue structuring the quiz questions. Please try again.',
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
      message: err.message || 'Unable to generate quiz right now. Please try again.',
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
    message: 'Unable to generate quiz right now. Please try again.',
    retryable: true,
  }
}

export const quizApi = {
  /**
   * Request a structured 3-question quiz with 4 options per question from educational text.
   */
  async generateQuiz(
    content: string,
    difficulty: QuizDifficulty = 'beginner',
  ): Promise<QuizResponse> {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      throw new Error('Please enter study material before generating a quiz.')
    }
    if (trimmedContent.length < 5) {
      throw new Error('Study material must be at least 5 characters.')
    }
    if (trimmedContent.length > 25000) {
      throw new Error('Study material must not exceed 25,000 characters.')
    }

    try {
      return await apiClient.post<QuizResponse>('/api/v1/quiz', {
        content: trimmedContent,
        difficulty,
        question_count: 3,
      })
    } catch (err) {
      const sanitized = sanitizeQuizError(err)
      const errorWithCode = new Error(sanitized.message)
      ;(errorWithCode as unknown as { code: string }).code = sanitized.code
      throw errorWithCode
    }
  },
}

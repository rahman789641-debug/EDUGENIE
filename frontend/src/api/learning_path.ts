/**
 * Personalized Learning Path API Client for EduGenie.
 * Communicates with POST /api/v1/learn/recommendations through centralized apiClient.
 * Never leaks API keys, Firebase tokens, or stack traces.
 */

import { apiClient, ApiError } from './client.ts'
import type {
  LearningLevel,
  LearningPathError,
  LearningPathResponse,
} from '../types/learning_path'

export function sanitizeLearningPathError(err: unknown): LearningPathError {
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
        message: 'Learning path generation took longer than expected. Please try again.',
        retryable: true,
      }
    }
    if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
      return {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Please provide a valid topic between 2 and 500 characters.',
        retryable: false,
      }
    }
    if (err.code === 'AI_GENERATION_ERROR') {
      return {
        code: 'AI_GENERATION_ERROR',
        message: 'EduGenie encountered an issue structuring the learning stages. Please try again.',
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
      message: err.message || 'Unable to generate learning path right now. Please try again.',
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
    message: 'Unable to generate learning path right now. Please try again.',
    retryable: true,
  }
}

export const learningPathApi = {
  /**
   * Request a structured personalized learning roadmap for a topic and level.
   */
  async getLearningRecommendations(
    topic: string,
    level: LearningLevel = 'beginner',
    goal?: string,
    durationWeeks: number = 8,
  ): Promise<LearningPathResponse> {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) {
      throw new Error('Please enter a topic before generating a learning path.')
    }
    if (trimmedTopic.length < 2) {
      throw new Error('Topic must be at least 2 characters.')
    }
    if (trimmedTopic.length > 500) {
      throw new Error('Topic must not exceed 500 characters.')
    }

    const trimmedGoal = goal ? goal.trim() : undefined
    if (trimmedGoal && trimmedGoal.length > 1000) {
      throw new Error('Goal must not exceed 1,000 characters.')
    }

    try {
      return await apiClient.post<LearningPathResponse>('/api/v1/learn/recommendations', {
        topic: trimmedTopic,
        level,
        goal: trimmedGoal || undefined,
        duration_weeks: durationWeeks,
      })
    } catch (err) {
      const sanitized = sanitizeLearningPathError(err)
      const errorWithCode = new Error(sanitized.message)
      ;(errorWithCode as unknown as { code: string }).code = sanitized.code
      throw errorWithCode
    }
  },
}

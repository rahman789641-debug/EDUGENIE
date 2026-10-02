/**
 * Strict TypeScript types for the EduGenie Concept Explanation Module.
 * Adheres to zero 'any' policy and mirrors backend schemas.
 */

export type ExplanationLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ExplanationRequestPayload {
  topic: string
  level?: ExplanationLevel
  depth?: 'summary' | 'standard' | 'in_depth'
  enable_web_grounding?: boolean
}

export interface ExplanationResponse {
  topic: string
  level: ExplanationLevel
  title: string
  explanation: string
  key_points: string[]
  example: string
  request_id: string
  analogies?: string[]
  key_takeaways?: string[]
  model?: string
  status?: string
}

export type ExplanationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ExplanationError {
  code: string
  message: string
  retryable: boolean
}

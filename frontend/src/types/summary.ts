/**
 * Strict TypeScript types for the EduGenie Summary Module.
 * Adheres to zero 'any' policy and mirrors backend schemas.
 */

export type SummaryLength = 'short' | 'medium' | 'detailed'

export interface SummaryRequestPayload {
  content: string
  length?: SummaryLength
  format?: 'bullet_points' | 'executive_summary' | 'key_takeaways'
  max_length_words?: number
}

export interface SummaryResponse {
  summary: string
  key_points: string[]
  length: SummaryLength
  request_id: string
  status?: string
  format?: string
  original_length_chars?: number
  summary_length_chars?: number
  model?: string
}

export type SummaryStatus = 'idle' | 'loading' | 'success' | 'error'

export interface SummaryError {
  code: string
  message: string
  retryable: boolean
}

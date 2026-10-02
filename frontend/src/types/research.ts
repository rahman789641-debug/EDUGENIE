/**
 * Strict TypeScript types for the EduGenie Web Research & Verified Sources Module.
 * Adheres to zero 'any' policy and mirrors backend schemas.
 */

export interface WebSource {
  title: string
  url: string
  domain: string
  snippet: string
}

export interface ResearchRequestPayload {
  query: string
}

export interface ResearchResponse {
  query: string
  answer: string
  sources: WebSource[]
  request_id?: string
  searched: boolean
  model?: string
  status: string
}

export type ResearchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ResearchError {
  code: string
  message: string
  retryable: boolean
}

export interface ResearchHistoryItem {
  id: string
  query: string
  timestamp: number
  response: ResearchResponse
}

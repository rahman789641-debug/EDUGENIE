/**
 * API response and error contract types.
 */

export interface HealthResponse {
  status: string
  service: string
}

export interface ApiErrorDetail {
  field?: string
  message: string
  type?: string
}

export interface ApiErrorPayload {
  code: string
  message: string
  details?: {
    errors?: ApiErrorDetail[]
    [key: string]: unknown
  }
}

export interface ApiErrorResponse {
  error: ApiErrorPayload
}

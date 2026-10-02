/**
 * Centralized API HTTP Client for EDUGENIE.
 * Ensures consistent error handling, headers, timeouts, and relative paths.
 * Never hardcodes localhost.
 */

import type { ApiErrorResponse } from '../types/api'
import { handleBrowserAiFallback } from '../lib/browserAiEngine.ts'

export class ApiError extends Error {
  public status: number
  public code: string
  public details?: unknown

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || ''
const DEFAULT_TIMEOUT_MS = 60000

let authTokenProvider: ((forceRefresh?: boolean) => Promise<string | null>) | null = null
let sessionExpiredHandler: (() => void) | null = null

/**
 * Configure an asynchronous token provider for authenticating requests to FastAPI.
 * Enables zero-overhead Bearer ID token attachment when a Firebase session is active.
 */
export function setAuthTokenProvider(
  provider: ((forceRefresh?: boolean) => Promise<string | null>) | null
): void {
  authTokenProvider = provider
}

/**
 * Register a global callback triggered when authentication is genuinely expired.
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  // Inject Firebase ID Token if an authenticated user session is active
  if (authTokenProvider && !headers.has('Authorization')) {
    try {
      const token = await authTokenProvider()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    } catch {
      // Non-fatal if token acquisition fails; downstream request proceeds
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (response.status === 401 && !isRetry && authTokenProvider) {
      try {
        const freshToken = await authTokenProvider(true)
        if (freshToken) {
          const retryHeaders = new Headers(headers)
          retryHeaders.set('Authorization', `Bearer ${freshToken}`)
          return await request<T>(endpoint, { ...options, headers: retryHeaders }, true)
        }
      } catch {
        // Token refresh failed, fall through to 401 handling
      }
    }

    if (!response.ok) {
      if (response.status === 404 && (!BASE_URL || (typeof window !== 'undefined' && window.location.hostname.includes('github.io')))) {
        try {
          const bodyPayload = options.body ? JSON.parse(options.body as string) : undefined
          return await handleBrowserAiFallback<T>(endpoint, bodyPayload)
        } catch {
          // If fallback fails, continue to normal error handling
        }
      }

      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
      let errorCode = `HTTP_${response.status}`
      let errorDetails: unknown = null

      try {
        const data: ApiErrorResponse = await response.json()
        if (data?.error) {
          errorMessage = data.error.message || errorMessage
          errorCode = data.error.code || errorCode
          errorDetails = data.error.details
        }
      } catch {
        // Non-JSON error body fallback
      }

      if (response.status === 401) {
        if (sessionExpiredHandler) {
          try {
            sessionExpiredHandler()
          } catch {
            // Handler error safety
          }
        }
        errorMessage = 'Your session has expired. Please sign in again.'
        errorCode = 'SESSION_EXPIRED'
      }

      throw new ApiError(response.status, errorMessage, errorCode, errorDetails)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T
    }

    return (await response.json()) as T
  } catch (err: unknown) {
    if (!BASE_URL || (typeof window !== 'undefined' && window.location.hostname.includes('github.io'))) {
      try {
        const bodyPayload = options.body ? JSON.parse(options.body as string) : undefined
        return await handleBrowserAiFallback<T>(endpoint, bodyPayload)
      } catch {
        // continue
      }
    }
    if (err instanceof ApiError) {
      throw err
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. Please check server connectivity.', 'REQUEST_TIMEOUT')
    }
    const message = err instanceof Error ? err.message : 'Unknown network failure'
    throw new ApiError(0, `Network error: ${message}`, 'NETWORK_ERROR')
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}

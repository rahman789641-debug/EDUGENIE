/**
 * Health check API service.
 * Interacts with canonical GET /api/v1/health (with fallback to /api/health)
 */

import { apiClient } from './client'
import type { HealthResponse } from '../types/api'

export async function fetchHealth(): Promise<{ data: HealthResponse; latencyMs: number }> {
  const start = performance.now()
  try {
    const data = await apiClient.get<HealthResponse>('/api/v1/health')
    const latencyMs = Math.round(performance.now() - start)
    return { data, latencyMs }
  } catch {
    // Graceful fallback to compatibility endpoint if v1 prefix is not mounted
    const data = await apiClient.get<HealthResponse>('/api/health')
    const latencyMs = Math.round(performance.now() - start)
    return { data, latencyMs }
  }
}

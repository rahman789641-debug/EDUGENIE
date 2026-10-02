/**
 * API client module for Learning Activity History and Dashboard Intelligence.
 */

import { apiClient } from './client'
import type {
  ActivityListResponse,
  DashboardStatsResponse,
  GetHistoryParams,
} from '../types/history'

export const historyApi = {
  /**
   * Fetch aggregate statistics and recent activities for the authenticated user.
   */
  getDashboardStats: async (): Promise<DashboardStatsResponse> => {
    return apiClient.get<DashboardStatsResponse>('/api/v1/dashboard/stats')
  },

  /**
   * Fetch paginated learning activity history for the authenticated user.
   */
  getHistory: async (params: GetHistoryParams = {}): Promise<ActivityListResponse> => {
    const searchParams = new URLSearchParams()
    if (params.page !== undefined && params.page > 0) {
      searchParams.set('page', params.page.toString())
    }
    if (params.page_size !== undefined && params.page_size > 0) {
      searchParams.set('page_size', params.page_size.toString())
    }
    if (params.activity_type) {
      searchParams.set('activity_type', params.activity_type)
    }

    const qs = searchParams.toString()
    const endpoint = `/api/v1/history${qs ? `?${qs}` : ''}`
    return apiClient.get<ActivityListResponse>(endpoint)
  },

  /**
   * Delete a learning activity history item strictly owned by authenticated user.
   */
  deleteHistoryItem: async (activityId: string): Promise<{ status: string; deleted: boolean }> => {
    return apiClient.delete<{ status: string; deleted: boolean }>(`/api/v1/history/${activityId}`)
  },
}

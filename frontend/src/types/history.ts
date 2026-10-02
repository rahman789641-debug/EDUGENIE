/**
 * Types and interfaces for Learning Activity History and Dashboard Intelligence.
 */

export type ActivityType =
  | 'qa'
  | 'explain'
  | 'quiz'
  | 'summarize'
  | 'learning_path'
  | 'research'

export interface LearningActivityItem {
  id: string
  user_id: string
  activity_type: ActivityType
  title: string
  input_snippet: string | null
  output_snippet: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ActivityListResponse {
  items: LearningActivityItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStatsResponse {
  total_activities: number
  questions_asked: number
  quizzes_completed: number
  explanations_generated: number
  summaries_generated: number
  learning_paths_generated: number
  research_queries: number
  recent_activities: LearningActivityItem[]
}

export interface GetHistoryParams {
  page?: number
  page_size?: number
  activity_type?: ActivityType | ''
}

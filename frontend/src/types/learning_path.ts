/**
 * Strict TypeScript types for the EduGenie Personalized Learning Path Module.
 * Adheres to zero 'any' policy and mirrors backend schemas.
 */

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

export type ResourceType = 'video' | 'article' | 'book' | 'documentation' | 'course'

export interface LearningResource {
  type: ResourceType | string
  title: string
  url?: string | null
}

export interface LearningStage {
  stage: number
  title: string
  difficulty: LearningLevel | string
  concepts: string[]
  practice: string[]
  resources: LearningResource[]
  checkpoint_project?: string | null
}

export interface LearningPathRequestPayload {
  topic: string
  level?: LearningLevel
  goal?: string
  duration_weeks?: number
}

export interface LearningPathResponse {
  topic: string
  level: LearningLevel | string
  goal?: string | null
  overview: string
  stages: LearningStage[]
  milestones?: LearningStage[]
  total_stages: number
  next_steps: string[]
  request_id: string
  status?: string
  model?: string
}

export type LearningPathStatus = 'idle' | 'loading' | 'success' | 'error'

export interface LearningPathError {
  code: string
  message: string
  retryable: boolean
}

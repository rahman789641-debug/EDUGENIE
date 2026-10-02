/**
 * Domain types for EDUGENIE educational features.
 */

export type EducationalFeatureId =
  | 'qa'
  | 'concept-explanation'
  | 'quiz-generation'
  | 'text-summarization'
  | 'learning-path'

export interface EducationalFeatureMetadata {
  id: EducationalFeatureId
  title: string
  shortDescription: string
  fullDescription: string
  badge: string
  icon: string
  status: 'foundation_ready' | 'in_development' | 'planned'
  capabilities: string[]
}

export interface QAQuery {
  question: string
  context?: string
  enableWebGrounding?: boolean
}

export interface ConceptExplanationQuery {
  concept: string
  targetAudience: 'elementary' | 'high_school' | 'undergraduate' | 'professional'
  depth: 'summary' | 'standard' | 'in_depth'
  enableWebGrounding?: boolean
}

export interface QuizGenerationQuery {
  topic: string
  numQuestions: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface TextSummarizationQuery {
  text: string
  format: 'bullet_points' | 'executive_summary' | 'key_takeaways'
  maxLength?: number
}

export interface LearningPathQuery {
  subject: string
  currentLevel: 'beginner' | 'intermediate' | 'advanced'
  targetGoal: string
  timeframeWeeks?: number
}

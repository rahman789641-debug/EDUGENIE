/**
 * Educational AI API Service Client for EDUGENIE.
 * Connects directly to backend endpoints:
 * - POST /api/v1/qa
 * - POST /api/v1/explain
 * - POST /api/v1/quiz
 * - POST /api/v1/summarize
 * - POST /api/v1/learn/recommendations
 *
 * Routes through centralized apiClient to /api/v1 without exposing secrets.
 */

import { apiClient } from './client'

export interface QAResponsePayload {
  status: string
  question: string
  answer: string
  sources: string[]
  grounded: boolean
  model?: string
  request_id?: string
}

export interface ExplainResponsePayload {
  status: string
  topic: string
  level: string
  depth: string
  explanation: string
  analogies: string[]
  key_takeaways: string[]
  model?: string
  request_id?: string
}

export interface QuizQuestionItem {
  id: number
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface QuizResponsePayload {
  status: string
  difficulty: string
  total_questions: number
  questions: QuizQuestionItem[]
  model?: string
  request_id?: string
}

export interface SummarizeResponsePayload {
  status: string
  format: string
  summary: string
  key_points: string[]
  original_length_chars: number
  summary_length_chars: number
  model?: string
  request_id?: string
}

export interface MilestoneStage {
  stage_number: number
  title: string
  focus_concepts: string[]
  recommended_activities: string[]
  checkpoint_project?: string
}

export interface LearningPathResponsePayload {
  status: string
  topic: string
  level: string
  target_goal?: string
  total_stages: number
  milestones: MilestoneStage[]
  model?: string
  request_id?: string
}

/**
 * Educational Q&A endpoint.
 * POST /api/v1/qa
 */
export async function askQuestion(
  question: string,
  context?: string,
  enableWebGrounding = false
): Promise<QAResponsePayload> {
  return apiClient.post<QAResponsePayload>('/api/v1/qa', {
    question,
    context: context || undefined,
    enable_web_grounding: enableWebGrounding,
  })
}

/**
 * Concept explanation endpoint.
 * POST /api/v1/explain
 */
export async function explainConcept(
  topic: string,
  level = 'undergraduate',
  depth = 'standard',
  enableWebGrounding = false
): Promise<ExplainResponsePayload> {
  return apiClient.post<ExplainResponsePayload>('/api/v1/explain', {
    topic,
    level,
    depth,
    enable_web_grounding: enableWebGrounding,
  })
}

/**
 * Adaptive Quiz generation endpoint.
 * POST /api/v1/quiz
 */
export async function generateQuiz(
  content: string,
  questionCount = 3,
  difficulty = 'medium'
): Promise<QuizResponsePayload> {
  return apiClient.post<QuizResponsePayload>('/api/v1/quiz', {
    content,
    question_count: questionCount,
    difficulty,
  })
}

/**
 * Educational text summarization endpoint.
 * POST /api/v1/summarize
 */
export async function summarizeContent(
  content: string,
  format = 'bullet_points',
  maxLengthWords?: number
): Promise<SummarizeResponsePayload> {
  return apiClient.post<SummarizeResponsePayload>('/api/v1/summarize', {
    content,
    format,
    max_length_words: maxLengthWords || undefined,
  })
}

/**
 * Milestone learning roadmap endpoint.
 * POST /api/v1/learn/recommendations
 */
export async function generateLearningRoadmap(
  topic: string,
  level = 'beginner',
  targetGoal?: string,
  durationWeeks = 8
): Promise<LearningPathResponsePayload> {
  return apiClient.post<LearningPathResponsePayload>('/api/v1/learn/recommendations', {
    topic,
    level,
    target_goal: targetGoal || undefined,
    duration_weeks: durationWeeks,
  })
}

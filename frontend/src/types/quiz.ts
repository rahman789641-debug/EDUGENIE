/**
 * Strict TypeScript types for the EduGenie Quiz Generation Module.
 * Adheres to zero 'any' policy and mirrors backend schemas.
 */

export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface QuizQuestion {
  id: string | number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  correct_index?: number
}

export interface QuizResponse {
  title: string
  questions: QuizQuestion[]
  difficulty?: QuizDifficulty
  total_questions?: number
  status?: string
  model?: string
  request_id?: string
}

export interface QuizSubmissionRecord {
  questionId: string | number
  selectedOption: string
  isCorrect: boolean
}

export interface QuizResultSummary {
  total: number
  correct: number
  percentage: number
  answers: Record<string | number, string>
  submitted: boolean
}

export interface QuizError {
  code: string
  message: string
  retryable: boolean
}

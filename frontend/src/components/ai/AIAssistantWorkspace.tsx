import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { BorderBeam } from '../ui/border-beam'
import { ShinyButton } from '../ui/shiny-button'
import { AIResponse, type AIResponseStatus } from './AIResponse'
import {
  askQuestion,
  explainConcept,
  generateQuiz,
  summarizeContent,
  generateLearningRoadmap,
  type QAResponsePayload,
  type ExplainResponsePayload,
  type QuizResponsePayload,
  type SummarizeResponsePayload,
  type LearningPathResponsePayload,
} from '../../api/ai'
import { QAView } from './views/QAView'
import { ExplainView } from './views/ExplainView'
import { QuizView } from './views/QuizView'
import { SummaryView } from './views/SummaryView'
import { LearningPathView } from './views/LearningPathView'

export type AITaskId = 'ask' | 'explain' | 'quiz' | 'summarize' | 'learn'

interface TaskOption {
  id: AITaskId
  label: string
  icon: string
  placeholder: string
  actionLabel: string
}

const TASKS: TaskOption[] = [
  {
    id: 'ask',
    label: 'Ask AI',
    icon: '💬',
    placeholder: 'Ask EduGenie anything about your studies (e.g., What is photosynthesis?)...',
    actionLabel: 'Generate Answer',
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: '💡',
    placeholder: 'Enter a topic to explain (e.g., Recursion, Quantum Entanglement)...',
    actionLabel: 'Explain Concept',
  },
  {
    id: 'quiz',
    label: 'Quiz',
    icon: '📝',
    placeholder: 'Paste notes or study text to generate multiple-choice questions...',
    actionLabel: 'Generate Quiz',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: '📚',
    placeholder: 'Paste educational passage or lecture transcript to summarize...',
    actionLabel: 'Summarize Text',
  },
  {
    id: 'learn',
    label: 'Learning Path',
    icon: '🎯',
    placeholder: 'Enter subject domain to generate roadmap (e.g., Python, Machine Learning)...',
    actionLabel: 'Generate Path',
  },
]

interface AIAssistantWorkspaceProps {
  initialTask?: AITaskId
}

export const AIAssistantWorkspace: React.FC<AIAssistantWorkspaceProps> = ({
  initialTask = 'ask',
}) => {
  const [activeTask, setActiveTask] = useState<AITaskId>(initialTask)
  const [inputText, setInputText] = useState('')
  const [contextText, setContextText] = useState('')
  const [webGrounding, setWebGrounding] = useState(false)

  // Sub-options state
  const [audience, setAudience] = useState('beginner')
  const [depth, setDepth] = useState('standard')
  const [quizCount, setQuizCount] = useState(3)
  const [quizDifficulty, setQuizDifficulty] = useState('medium')
  const [summaryFormat, setSummaryFormat] = useState('bullet_points')
  const [targetGoal, setTargetGoal] = useState('')
  const [durationWeeks, setDurationWeeks] = useState(8)

  // Execution & Response States
  const [status, setStatus] = useState<AIResponseStatus>('empty')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [qaData, setQaData] = useState<QAResponsePayload | null>(null)
  const [explainData, setExplainData] = useState<ExplainResponsePayload | null>(null)
  const [quizData, setQuizData] = useState<QuizResponsePayload | null>(null)
  const [summaryData, setSummaryData] = useState<SummarizeResponsePayload | null>(null)
  const [learnData, setLearnData] = useState<LearningPathResponsePayload | null>(null)

  const currentTask = TASKS.find((t) => t.id === activeTask) || TASKS[0]

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if (!inputText.trim()) return

    setStatus('loading')
    setErrorMessage(null)

    try {
      if (activeTask === 'ask') {
        const res = await askQuestion(inputText.trim(), contextText.trim(), webGrounding)
        setQaData(res)
        setStatus('success')
      } else if (activeTask === 'explain') {
        const res = await explainConcept(inputText.trim(), audience, depth, webGrounding)
        setExplainData(res)
        setStatus('success')
      } else if (activeTask === 'quiz') {
        const res = await generateQuiz(inputText.trim(), quizCount, quizDifficulty)
        setQuizData(res)
        setStatus('success')
      } else if (activeTask === 'summarize') {
        const res = await summarizeContent(inputText.trim(), summaryFormat)
        setSummaryData(res)
        setStatus('success')
      } else if (activeTask === 'learn') {
        const res = await generateLearningRoadmap(
          inputText.trim(),
          audience,
          targetGoal.trim() || undefined,
          durationWeeks
        )
        setLearnData(res)
        setStatus('success')
      }
    } catch (err: unknown) {
      setStatus('error')
      let message = 'An unexpected error occurred while communicating with the AI service.'
      if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: string }).message)
      }
      setErrorMessage(message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Card
        title="AI Learning Workspace"
        subtitle="Connected to Google Gemini AI Backend Pipeline"
        action={
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-accent-cyan)',
              background: 'var(--color-accent-cyan-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            Gemini Pipeline
          </span>
        }
      >
        {/* Task Selector */}
        <div className="task-selector-list" role="tablist" aria-label="Educational AI Task Selector">
          {TASKS.map((task) => {
            const isActive = task.id === activeTask
            return (
              <button
                key={task.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTask(task.id)
                  setStatus('empty')
                  setErrorMessage(null)
                }}
                className={`task-tab-btn ${isActive ? 'active' : ''}`}
                id={`task-tab-${task.id}`}
              >
                <span aria-hidden="true">{task.icon}</span>
                <span>{task.label}</span>
              </button>
            )
          })}
        </div>

        <form onSubmit={handleGenerate}>
          {/* Dynamic Configuration Controls per task */}
          {activeTask === 'explain' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <label className="form-label">Target Audience / Level</label>
                <select
                  id="select-explain-level"
                  className="form-input"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="elementary">Elementary (ELI5)</option>
                  <option value="high_school">High School</option>
                  <option value="undergraduate">Undergraduate Student</option>
                  <option value="advanced">Advanced</option>
                  <option value="professional">Professional / Expert</option>
                </select>
              </div>

              <div>
                <label className="form-label">Depth Level</label>
                <select
                  id="select-explain-depth"
                  className="form-input"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                >
                  <option value="summary">Summary</option>
                  <option value="standard">Standard</option>
                  <option value="in_depth">In-Depth</option>
                </select>
              </div>
            </div>
          )}

          {activeTask === 'quiz' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <label className="form-label">Question Count</label>
                <select
                  id="select-quiz-count"
                  className="form-input"
                  value={quizCount}
                  onChange={(e) => setQuizCount(Number(e.target.value))}
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>

              <div>
                <label className="form-label">Difficulty Tier</label>
                <select
                  id="select-quiz-difficulty"
                  className="form-input"
                  value={quizDifficulty}
                  onChange={(e) => setQuizDifficulty(e.target.value)}
                >
                  <option value="easy">Easy (Fundamentals)</option>
                  <option value="medium">Medium (Analytical)</option>
                  <option value="hard">Hard (Advanced / Edge-cases)</option>
                </select>
              </div>
            </div>
          )}

          {activeTask === 'summarize' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <label className="form-label">Summary Format</label>
                <select
                  id="select-summary-format"
                  className="form-input"
                  value={summaryFormat}
                  onChange={(e) => setSummaryFormat(e.target.value)}
                >
                  <option value="bullet_points">Hierarchical Bullet Points</option>
                  <option value="executive_summary">Executive Summary</option>
                  <option value="key_takeaways">Core Formulae & Definitions</option>
                </select>
              </div>
            </div>
          )}

          {activeTask === 'learn' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <label className="form-label">Starting Competency Level</label>
                <select
                  id="select-learn-level"
                  className="form-input"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="form-label">Target Timeframe (Weeks)</label>
                <input
                  id="input-learn-duration"
                  type="number"
                  min={1}
                  max={52}
                  className="form-input"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Specific Mastery Goal (Optional)</label>
                <input
                  id="input-learn-goal"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Build and deploy production-grade SaaS web applications"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Primary Prompt Input Area */}
          <div className="form-group">
            <label htmlFor="ai-prompt-input" className="form-label">
              <span>{activeTask === 'explain' ? 'Topic / Concept' : 'Learning Prompt / Material'}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                {inputText.length} characters
              </span>
            </label>
            <BorderBeam
              size="md"
              borderRadius={10}
              colorVariant="colorful"
              className="workspace-border-beam-wrapper"
            >
              <textarea
                id="ai-prompt-input"
                className="ai-textarea"
                placeholder={currentTask.placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={4}
              />
            </BorderBeam>
          </div>

          {/* Optional Reference Context for Q&A */}
          {activeTask === 'ask' && (
            <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
              <label htmlFor="ai-context-input" className="form-label">
                <span>Optional Reference Study Material / Notes</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                  {contextText.length} characters
                </span>
              </label>
              <BorderBeam
                size="md"
                borderRadius={10}
                colorVariant="colorful"
                className="workspace-border-beam-wrapper"
              >
                <textarea
                  id="ai-context-input"
                  className="ai-textarea"
                  placeholder="Paste reference textbook excerpts or study notes here..."
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  rows={2}
                />
              </BorderBeam>
            </div>
          )}

          {/* Grounding & Submission Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-3)',
            }}
          >
            {(activeTask === 'ask' || activeTask === 'explain') && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  id="checkbox-web-grounding"
                  type="checkbox"
                  checked={webGrounding}
                  onChange={(e) => setWebGrounding(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>Enable Web Search Grounding</span>
              </label>
            )}

            <ShinyButton
              id="btn-generate-answer"
              type="submit"
              size="pill"
              cornerRadius={16}
              fillColor="#1e1b4b"
              accentColor="#ff5f00"
              disabled={!inputText.trim() || status === 'loading'}
              style={{ marginLeft: 'auto' }}
            >
              <span>✨</span>
              <span>{status === 'loading' ? 'Processing...' : currentTask.actionLabel}</span>
            </ShinyButton>
          </div>
        </form>
      </Card>

      {/* AI Response Output Area */}
      <AIResponse
        taskTitle={currentTask.label}
        status={status}
        error={errorMessage}
        loadingMessage={`Synthesizing ${currentTask.label} via Google Gemini...`}
        onRetry={handleGenerate}
      >
        {activeTask === 'ask' && qaData && <QAView data={qaData} />}
        {activeTask === 'explain' && explainData && <ExplainView data={explainData} />}
        {activeTask === 'quiz' && quizData && <QuizView data={quizData} />}
        {activeTask === 'summarize' && summaryData && <SummaryView data={summaryData} />}
        {activeTask === 'learn' && learnData && <LearningPathView data={learnData} />}
      </AIResponse>
    </div>
  )
}

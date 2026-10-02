import React, { useState } from 'react'
import { InteractiveQuiz } from '../../components/quiz/InteractiveQuiz'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const QuizPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'quiz' | 'workspace'>('quiz')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Adaptive Quiz Generation
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Transform study passages, lecture transcripts, and curriculum notes into 3 targeted assessment questions with rationales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('quiz')}
            id="tab-quiz-mode"
          >
            📝 Interactive Quiz
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'workspace' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('workspace')}
            id="tab-workspace-mode"
          >
            📋 Textbook Lab
          </button>
        </div>
      </div>

      {viewMode === 'quiz' ? (
        <InteractiveQuiz />
      ) : (
        <AIAssistantWorkspace initialTask="quiz" />
      )}
    </div>
  )
}

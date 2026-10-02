import React, { useState } from 'react'
import { PersonalizedLearningPath } from '../../components/learning_path/PersonalizedLearningPath'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const LearningPathPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'path' | 'workspace'>('path')

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
            Personalized Learning Pathways
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Formulate structured, milestone-based curricula mapping prerequisite knowledge to mastery objectives.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'path' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('path')}
            id="tab-path-mode"
          >
            🗺️ Personalized Learning Path
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

      {viewMode === 'path' ? (
        <PersonalizedLearningPath />
      ) : (
        <AIAssistantWorkspace initialTask="learn" />
      )}
    </div>
  )
}

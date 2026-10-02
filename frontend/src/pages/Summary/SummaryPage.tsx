import React, { useState } from 'react'
import { EducationalSummarizer } from '../../components/summary/EducationalSummarizer'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const SummaryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'summarizer' | 'workspace'>('summarizer')

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
            Text & Lecture Summarization
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Distill dense reading material, research publications, or lecture transcripts into concise, structured study notes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'summarizer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('summarizer')}
            id="tab-summarizer-mode"
          >
            📖 Educational Summarizer
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

      {viewMode === 'summarizer' ? (
        <EducationalSummarizer />
      ) : (
        <AIAssistantWorkspace initialTask="summarize" />
      )}
    </div>
  )
}

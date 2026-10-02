import React, { useState } from 'react'
import { WebResearchAssistant } from '../../components/research/WebResearchAssistant'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const ResearchPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'research' | 'workspace'>('research')

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
            Web Research &amp; Verified External Sources
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Query real-time educational web sources and synthesize grounded explanations with verifiable citations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'research' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('research')}
            id="tab-research-mode"
          >
            🌐 Live Web Research
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

      {viewMode === 'research' ? (
        <WebResearchAssistant />
      ) : (
        <AIAssistantWorkspace initialTask="explain" />
      )}
    </div>
  )
}

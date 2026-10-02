import React, { useState } from 'react'
import { ConceptExplainer } from '../../components/explanation/ConceptExplainer'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const ExplainPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'explainer' | 'workspace'>('explainer')

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
            Concept Deconstruction & Explanation
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Deconstruct complex topics into intuitive analogies, first-principles derivations, and multi-level explanations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'explainer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('explainer')}
            id="tab-explainer-mode"
          >
            💡 Concept Explainer
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

      {viewMode === 'explainer' ? (
        <ConceptExplainer />
      ) : (
        <AIAssistantWorkspace initialTask="explain" />
      )}
    </div>
  )
}

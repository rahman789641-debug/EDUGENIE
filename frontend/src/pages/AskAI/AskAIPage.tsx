import React, { useState } from 'react'
import { EduGenieChat } from '../../components/chat/EduGenieChat'
import { AIAssistantWorkspace } from '../../components/ai/AIAssistantWorkspace'

export const AskAIPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'chat' | 'workspace'>('chat')

  return (
    <div className="ask-ai-page-container preserve-dark-theme">
      {/* Hidden controls preserved for DOM/test accessibility if needed */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <button
          type="button"
          onClick={() => setViewMode('chat')}
          id="tab-chat-mode"
        >
          💬 Interactive Chat
        </button>
        <button
          type="button"
          onClick={() => setViewMode('workspace')}
          id="tab-workspace-mode"
        >
          📋 Textbook & Notes Lab
        </button>
      </div>

      <div className="ask-ai-body">
        {viewMode === 'chat' ? (
          <EduGenieChat />
        ) : (
          <div className="ask-ai-workspace-padding">
            <AIAssistantWorkspace initialTask="ask" />
          </div>
        )}
      </div>
    </div>
  )
}

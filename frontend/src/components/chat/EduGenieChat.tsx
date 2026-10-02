import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import type { ChatMessage, ChatStatus, QAMode } from '../../types/chat'
import { qaApi, sanitizeErrorMessage } from '../../api/qa'
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer'
import {
  ArrowUpIcon,
  Paperclip,
  Code2,
  Layers,
  Rocket,
  Palette,
  MonitorIcon,
  FileUp,
  CircleUserRound,
  ImageIcon,
  Pencil,
  Copy,
  Check,
  X,
  SquarePen,
} from 'lucide-react'
import aiStarIcon from '../../assets/ai-star-icon.webp'
import {
  saveChatSession,
  getChatSession,
  findSessionByQuery,
  isChatDeleted,
} from '../../utils/chatStorage'
import { BorderBeam } from '../ui/border-beam'
import { ShinyButton } from '../ui/shiny-button'

const QUICK_ACTIONS = [
  {
    icon: <Code2 className="w-3.5 h-3.5" />,
    label: 'Generate Code',
    query: 'What is recursion? Show me an example with code.',
  },
  {
    icon: <Rocket className="w-3.5 h-3.5" />,
    label: 'Launch App',
    query: 'How does a REST API work?',
  },
  {
    icon: <Layers className="w-3.5 h-3.5" />,
    label: 'UI Components',
    query: 'Explain React component lifecycle.',
  },
  {
    icon: <Palette className="w-3.5 h-3.5" />,
    label: 'Theme Ideas',
    query: 'Give me modern UI theme ideas with dark mode.',
  },
  {
    icon: <CircleUserRound className="w-3.5 h-3.5" />,
    label: 'User Dashboard',
    query: 'Build a personalized learning roadmap.',
  },
  {
    icon: <MonitorIcon className="w-3.5 h-3.5" />,
    label: 'Landing Page',
    query: 'Explain photosynthesis.',
  },
  {
    icon: <FileUp className="w-3.5 h-3.5" />,
    label: 'Upload Docs',
    query: 'How do I summarize textbook revision notes?',
  },
  {
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    label: 'Image Assets',
    query: 'Quantum Computing basics explained simply.',
  },
]

const TYPEWRITER_PHRASES = [
  'Type your request...',
  'What is quantum computing?',
  'Explain photosynthesis simply...',
  'How does a REST API work?',
  'Explain React component lifecycle...',
  'Build a personalized learning roadmap...',
  'What is recursion? Show me an example with code...',
]

interface AutoResizeProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity),
      )
      textarea.style.height = `${newHeight}px`
    },
    [minHeight, maxHeight],
  )

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`
  }, [minHeight])

  return { textareaRef, adjustHeight }
}

export const EduGenieChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [mode, setMode] = useState<QAMode>('ai')
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [researchStep, setResearchStep] = useState<'searching' | 'analyzing'>('searching')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const editInputRef = useRef<HTMLTextAreaElement | null>(null)

  // Typewriter placeholder animation state
  const [isFocused, setIsFocused] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const isSubmittingRef = useRef<boolean>(false)

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  })

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `chat-${Date.now()}`)
  const sessionIdRef = useRef<string>(currentSessionId)
  useEffect(() => {
    sessionIdRef.current = currentSessionId
  }, [currentSessionId])

  const persistSession = useCallback(
    (sessionId: string, newMessages: ChatMessage[], activeMode: QAMode) => {
      if (!newMessages || newMessages.length === 0) return
      const firstUserMsg = newMessages.find((m) => m.role === 'user')
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 80) : 'AI Chat'
      saveChatSession({
        id: sessionId,
        title,
        messages: newMessages,
        mode: activeMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    },
    [],
  )

  const handleNewChat = useCallback(() => {
    const newId = `chat-${Date.now()}`
    setCurrentSessionId(newId)
    sessionIdRef.current = newId
    setMessages([])
    setInputQuestion('')
    setErrorMessage(null)
    setStatus('idle')
    setIsFocused(false)
    setCharIdx(0)
    setIsDeleting(false)
    adjustHeight(true)
    setSearchParams({}, { replace: true })
    navigate('/ask', { replace: true, state: {} })
  }, [adjustHeight, navigate, setSearchParams])

  // Listen for chat deletion: if active conversation was deleted, immediately reset to blank new chat
  useEffect(() => {
    const handleChatDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string; title?: string; question?: string }>
      const deletedId = customEvent.detail?.id
      const deletedTitle = customEvent.detail?.title?.trim().toLowerCase()
      const deletedQ = customEvent.detail?.question?.trim().toLowerCase()

      const isCurrentDeleted =
        (deletedId && (sessionIdRef.current === deletedId || deletedId.includes(sessionIdRef.current))) ||
        (deletedTitle && messages.some((m) => m.role === 'user' && m.content.trim().toLowerCase() === deletedTitle)) ||
        (deletedQ && messages.some((m) => m.role === 'user' && m.content.trim().toLowerCase() === deletedQ))

      if (isCurrentDeleted) {
        handleNewChat()
      }
    }

    window.addEventListener('edugenie-chat-deleted', handleChatDeleted)
    return () => {
      window.removeEventListener('edugenie-chat-deleted', handleChatDeleted)
    }
  }, [handleNewChat, messages])

  // Handle tap / click outside chat input to deactivate glowing border beam ("touch pana matum tha varanum")
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const chatWrapper = document.querySelector('.chat-border-beam-wrapper')
      if (chatWrapper && !chatWrapper.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
    }
  }, [])

  // Handle restoring chat from query params or location state (e.g., clicking chat history in sidebar)
  useEffect(() => {
    const locState = location.state as {
      chatId?: string
      title?: string
      question?: string
      answer?: string
      mode?: QAMode
      createdAt?: string
    } | null

    const chatId = searchParams.get('chatId') || locState?.chatId
    const q = searchParams.get('q')

    if (chatId) {
      // If deleted, abort and clear URL
      if (isChatDeleted(chatId, locState?.title, locState?.question)) {
        setSearchParams({}, { replace: true })
        navigate('/ask', { replace: true, state: {} })
        return
      }

      // 1. Try local storage first (by exact ID or query fallback)
      let stored = getChatSession(chatId)
      if (!stored && (locState?.title || locState?.question)) {
        stored = findSessionByQuery(locState.question || locState.title || '')
      }
      if (stored && stored.messages.length > 0) {
        if (isChatDeleted(stored.id, stored.title)) {
          setSearchParams({}, { replace: true })
          navigate('/ask', { replace: true, state: {} })
          return
        }
        setCurrentSessionId(stored.id)
        sessionIdRef.current = stored.id
        setMessages(stored.messages)
        if (stored.mode) setMode(stored.mode)
        setErrorMessage(null)
        setStatus('idle')
        setInputQuestion('')
        setIsFocused(false)
        return
      }

      // 2. If not in localStorage, reconstruct from location state
      if (locState?.question || locState?.answer) {
        if (isChatDeleted(chatId, locState.title, locState.question)) {
          setSearchParams({}, { replace: true })
          navigate('/ask', { replace: true, state: {} })
          return
        }
        const restored: ChatMessage[] = []
        const timeStr = locState.createdAt
          ? new Date(locState.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (locState.question) {
          restored.push({
            id: `user-${chatId}`,
            role: 'user',
            content: locState.question,
            createdAt: timeStr,
            mode: locState.mode || 'ai',
          })
        }
        if (locState.answer) {
          restored.push({
            id: `ai-${chatId}`,
            role: 'assistant',
            content: locState.answer,
            createdAt: timeStr,
            mode: locState.mode || 'ai',
          })
        }

        if (restored.length > 0) {
          setCurrentSessionId(chatId)
          sessionIdRef.current = chatId
          setMessages(restored)
          if (locState.mode) setMode(locState.mode)
          setErrorMessage(null)
          setStatus('idle')
          setInputQuestion('')
          setIsFocused(false)

          saveChatSession({
            id: chatId,
            title: locState.title || locState.question || 'AI Chat',
            messages: restored,
            mode: locState.mode || 'ai',
            createdAt: locState.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          return
        }
      }
    }

    // 3. Fallback for 'q' parameter
    if (q) {
      const foundSession = findSessionByQuery(q)
      if (foundSession && foundSession.messages.length > 0) {
        setCurrentSessionId(foundSession.id)
        sessionIdRef.current = foundSession.id
        setMessages(foundSession.messages)
        if (foundSession.mode) setMode(foundSession.mode)
        setErrorMessage(null)
        setStatus('idle')
        setInputQuestion('')
        setIsFocused(false)
        return
      }

      setIsFocused(true)
      setInputQuestion(q)
      setSearchParams({}, { replace: true })
      setTimeout(() => {
        adjustHeight()
        textareaRef.current?.focus()
      }, 50)
    }
  }, [searchParams, location.state, setSearchParams, adjustHeight, textareaRef])

  // Typewriter animation running when NOT focused and NO text typed
  useEffect(() => {
    if (isFocused || inputQuestion) return

    const currentPhrase = TYPEWRITER_PHRASES[phraseIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting) {
      if (charIdx < currentPhrase.length) {
        timeout = setTimeout(() => {
          setCharIdx((prev) => prev + 1)
        }, 55)
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, 1800)
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => {
          setCharIdx((prev) => prev - 1)
        }, 28)
      } else {
        setIsDeleting(false)
        setPhraseIdx((prev) => (prev + 1) % TYPEWRITER_PHRASES.length)
        timeout = setTimeout(() => {}, 350)
      }
    }

    return () => clearTimeout(timeout)
  }, [charIdx, isDeleting, phraseIdx, isFocused, inputQuestion])

  const displayedPlaceholder = TYPEWRITER_PHRASES[phraseIdx].slice(0, charIdx)

  // Progressive research loading status (transition to Analyzing sources...)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (status === 'loading' && mode === 'research') {
      timer = setTimeout(() => {
        setResearchStep('analyzing')
      }, 1400)
    }
    return () => clearTimeout(timer)
  }, [status, mode])

  // Auto-scroll to bottom of conversation
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, status, scrollToBottom])

  const handleExampleClick = (queryText: string) => {
    setIsFocused(true)
    setInputQuestion(queryText)
    if (status === 'error') {
      setStatus('idle')
      setErrorMessage(null)
    }
    setTimeout(() => {
      adjustHeight()
      textareaRef.current?.focus()
    }, 10)
  }

  const handleClearConversation = () => {
    handleNewChat()
  }

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(msgId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
    }
  }

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id)
    setEditingText(msg.content)
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus()
        editInputRef.current.style.height = 'auto'
        editInputRef.current.style.height = `${Math.max(64, editInputRef.current.scrollHeight)}px`
      }
    }, 50)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  const handleSaveEdit = async (messageId: string) => {
    const trimmed = editingText.trim()
    if (!trimmed || isSubmittingRef.current || status === 'loading') {
      return
    }

    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex === -1) {
      setEditingMessageId(null)
      return
    }

    const targetMsg = messages[msgIndex]
    const activeMode = targetMsg.mode || mode

    // Downstream answer removal: "kodutha down la vatha answer remove ahgi atha edit pana question ku re answer crt answer tharanum bro"
    const updatedUserMessage: ChatMessage = {
      ...targetMsg,
      content: trimmed,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Keep all conversation history up to this question, remove everything after it
    const priorHistory = messages.slice(0, msgIndex)
    const newHistory = [...priorHistory, updatedUserMessage]

    setMessages(newHistory)
    setEditingMessageId(null)
    setEditingText('')
    persistSession(sessionIdRef.current, newHistory, activeMode)
    window.dispatchEvent(new CustomEvent('edugenie-history-updated'))

    // Immediately trigger fresh AI generation
    isSubmittingRef.current = true
    setStatus('loading')
    setResearchStep('searching')
    setErrorMessage(null)

    try {
      const lastTurns = priorHistory.slice(-4)
      const contextSummary =
        lastTurns.length > 0
          ? lastTurns
              .map((m) => `${m.role === 'user' ? 'Student' : 'EduGenie'}: ${m.content.slice(0, 300)}`)
              .join('\n')
          : null

      const result = await qaApi.askQuestion({
        question: trimmed,
        context: contextSummary,
        mode: activeMode,
      })

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: result.model,
        requestId: result.request_id,
        mode: result.mode || activeMode,
        sources: result.sources || [],
      }

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMessage]
        persistSession(sessionIdRef.current, nextMsgs, result.mode || activeMode)
        window.dispatchEvent(new CustomEvent('edugenie-history-updated'))
        return nextMsgs
      })
      setStatus('idle')
      setErrorMessage(null)
    } catch (err: unknown) {
      console.error('[Chat Save Edit Error]:', err)
      setStatus('error')
      const msg = err instanceof Error ? err.message : sanitizeErrorMessage(err, activeMode)
      setErrorMessage(msg)
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuestion(e.target.value)
    adjustHeight()
    if (status === 'error') {
      setStatus('idle')
      setErrorMessage(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const lastQuestionRef = useRef<{ question: string; mode: QAMode } | null>(null)

  const handleRetry = async () => {
    if (isSubmittingRef.current || status === 'loading') return

    let retryQuestion = lastQuestionRef.current?.question || ''
    let retryMode = lastQuestionRef.current?.mode || mode

    if (!retryQuestion) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (lastUserMsg) {
        retryQuestion = lastUserMsg.content
        retryMode = lastUserMsg.mode || mode
      } else if (inputQuestion.trim()) {
        retryQuestion = inputQuestion.trim()
      }
    }

    if (!retryQuestion) return

    isSubmittingRef.current = true
    setStatus('loading')
    setResearchStep('searching')
    setErrorMessage(null)

    try {
      const lastTurns = messages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-4)
      const contextSummary =
        lastTurns.length > 0
          ? lastTurns
              .map((m) => `${m.role === 'user' ? 'Student' : 'EduGenie'}: ${m.content.slice(0, 300)}`)
              .join('\n')
          : null

      const result = await qaApi.askQuestion({
        question: retryQuestion,
        context: contextSummary,
        mode: retryMode,
      })

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: result.model,
        requestId: result.request_id,
        mode: result.mode || retryMode,
        sources: result.sources || [],
      }

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMessage]
        persistSession(sessionIdRef.current, nextMsgs, result.mode || retryMode)
        window.dispatchEvent(new CustomEvent('edugenie-history-updated'))
        return nextMsgs
      })
      setStatus('idle')
      setErrorMessage(null)
    } catch (err: unknown) {
      console.error('[Chat Retry Error]:', err)
      setStatus('error')
      const msg = err instanceof Error ? err.message : sanitizeErrorMessage(err, retryMode)
      setErrorMessage(msg)
    } finally {
      isSubmittingRef.current = false
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  const handleSend = async () => {
    const trimmed = inputQuestion.trim()
    if (!trimmed || isSubmittingRef.current || status === 'loading') {
      return
    }

    lastQuestionRef.current = { question: trimmed, mode }
    isSubmittingRef.current = true
    setStatus('loading')
    setResearchStep('searching')
    setErrorMessage(null)

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    }

    // Append user message immediately
    const nextWithUser = [...messages, userMessage]
    setMessages(nextWithUser)
    setInputQuestion('')
    adjustHeight(true)

    // Save IMMEDIATELY so even with just 1 question, it appears in History right away!
    persistSession(sessionIdRef.current, nextWithUser, mode)
    window.dispatchEvent(
      new CustomEvent('edugenie-history-updated', {
        detail: {
          sessionId: sessionIdRef.current,
          title: trimmed.slice(0, 100),
          question: trimmed,
          mode,
        },
      }),
    )

    try {
      // Prepare bounded conversation history context for follow-ups (max last 4 turns, 300 chars each)
      const lastTurns = messages.slice(-4)
      const contextSummary =
        lastTurns.length > 0
          ? lastTurns
              .map((m) => `${m.role === 'user' ? 'Student' : 'EduGenie'}: ${m.content.slice(0, 300)}`)
              .join('\n')
          : null

      const result = await qaApi.askQuestion({
        question: trimmed,
        context: contextSummary,
        mode,
      })

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: result.model,
        requestId: result.request_id,
        mode: result.mode || mode,
        sources: result.sources || [],
      }

      setMessages((prev) => {
        const nextMsgs = [...prev, assistantMessage]
        persistSession(sessionIdRef.current, nextMsgs, result.mode || mode)
        window.dispatchEvent(
          new CustomEvent('edugenie-history-updated', {
            detail: {
              sessionId: sessionIdRef.current,
              title: trimmed.slice(0, 100),
              question: trimmed,
              answer: result.answer,
              mode: result.mode || mode,
            },
          }),
        )
        return nextMsgs
      })
      setStatus('idle')
      setErrorMessage(null)
    } catch (err: unknown) {
      console.error('[Chat Send Error]:', err)
      setStatus('error')
      const msg = err instanceof Error ? err.message : sanitizeErrorMessage(err, mode)
      setErrorMessage(msg)
    } finally {
      isSubmittingRef.current = false
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  // Sleek Reusable Chat Input Card matching Image 2 with animated BorderBeam on touch/focus
  const renderChatBox = () => (
    <BorderBeam
      size="md"
      colorVariant="colorful"
      borderRadius={16}
      active={isFocused}
      className="chat-border-beam-wrapper"
    >
      <div
        className="chat-input-box"
        onClick={() => {
          setIsFocused(true)
          textareaRef.current?.focus()
        }}
        onTouchStart={() => setIsFocused(true)}
      >
      {/* Auto-resizing transparent textarea with animated typewriter placeholder */}
      <div className="chat-textarea-container">
        {!isFocused && !inputQuestion && (
          <div className="chat-typewriter-overlay" aria-hidden="true">
            <span className="typewriter-text">{displayedPlaceholder}</span>
            <span className="typewriter-cursor">|</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          id="chat-question-input"
          value={inputQuestion}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (!inputQuestion.trim()) {
              setIsFocused(false)
            }
          }}
          onTouchStart={() => setIsFocused(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isFocused
              ? mode === 'research'
                ? 'Search the web or ask a research question...'
                : 'Type your request...'
              : ''
          }
          className="chat-textarea"
          disabled={status === 'loading'}
          aria-label="Ask EduGenie an educational question"
        />
      </div>

      {/* Footer bar inside the card */}
      <div className="chat-input-footer" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {/* Paperclip attachment button */}
          <ShinyButton
            type="button"
            className="moon-icon-btn"
            title="Attach context or notes"
            aria-label="Attach context"
            size="icon"
            cornerRadius={10}
            fillColor="#18181b"
            accentColor="#ff5f00"
          >
            <Paperclip className="w-4 h-4" />
          </ShinyButton>

          {/* Sleek Low-Profile Mode Selector */}
          <div className="chat-mode-bar" data-testid="chat-mode-bar">
            <div className="chat-mode-group">
              <span className="chat-mode-label sr-only">Mode:</span>
              <div className="chat-mode-options" role="radiogroup" aria-label="Q&A Mode Selection">
                <ShinyButton
                  type="button"
                  id="mode-ai"
                  role="radio"
                  aria-checked={mode === 'ai'}
                  className={`chat-mode-btn ${mode === 'ai' ? 'active' : ''}`}
                  onClick={() => setMode('ai')}
                  disabled={status === 'loading'}
                  data-testid="mode-selector-ai"
                  size="pill"
                  cornerRadius={20}
                  fillColor={mode === 'ai' ? '#18181b' : '#09090b'}
                  accentColor="#ff5f00"
                >
                  <span className="chat-mode-radio-circle" />
                  <span>AI Answer</span>
                </ShinyButton>
                <ShinyButton
                  type="button"
                  id="mode-research"
                  role="radio"
                  aria-checked={mode === 'research'}
                  className={`chat-mode-btn ${mode === 'research' ? 'active research-active' : ''}`}
                  onClick={() => setMode('research')}
                  disabled={status === 'loading'}
                  data-testid="mode-selector-research"
                  size="pill"
                  cornerRadius={20}
                  fillColor={mode === 'research' ? '#18181b' : '#09090b'}
                  accentColor="#ff5f00"
                >
                  <span className="chat-mode-radio-circle" />
                  <span>Web Research</span>
                </ShinyButton>
              </div>
            </div>

            <span className="sr-only" data-testid="mode-indicator-ai">
              AI Answer
            </span>
            <span className="sr-only" data-testid="mode-indicator-research">
              Web Research
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline mr-1">
            {inputQuestion.trim().length} / 2000
          </span>

          <ShinyButton
            type="button"
            id="btn-send-question"
            data-testid="chat-send-btn"
            onClick={handleSend}
            disabled={!inputQuestion.trim() || status === 'loading'}
            aria-label="Send question"
            size="icon"
            cornerRadius={10}
            className={`chat-send-arrow-btn ${
              inputQuestion.trim() && status !== 'loading' ? 'active' : 'disabled'
            }`}
            fillColor={inputQuestion.trim() && status !== 'loading' ? '#ffffff' : '#18181b'}
            labelColor={inputQuestion.trim() && status !== 'loading' ? '#000000' : '#71717a'}
            accentColor="#ff5f00"
          >
            <ArrowUpIcon className="w-4 h-4" />
            <span className="sr-only">Send</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  </BorderBeam>
  )

  return (
    <div className={`chat-layout-wrapper ${messages.length > 0 ? 'chat-dimmed-bg' : ''}`}>
      {/* Conversation Header Bar - shown when conversation has messages */}
      {messages.length > 0 && (
        <div className="chat-header-bar">
          <div className="chat-header-info">
            <div className="chat-avatar-badge" aria-hidden="true">
              <img src={aiStarIcon} alt="EduGenie AI" className="chat-ai-star-icon" />
            </div>
            <div>
              <h3 className="chat-header-title">EduGenie Assistant</h3>
              <p className="chat-header-subtitle">Personalized Learning &amp; Web Grounding</p>
            </div>
          </div>

          <div className="chat-header-actions">
            <ShinyButton
              type="button"
              id="btn-new-chat"
              className="chat-header-new-chat-btn"
              onClick={handleNewChat}
              title="Start a new chat"
              aria-label="Start new chat"
              size="pill"
              cornerRadius={20}
              fillColor="#18181b"
              accentColor="#ff5f00"
            >
              <SquarePen size={14} className="chat-header-new-chat-icon" />
              <span>New Chat</span>
            </ShinyButton>
          </div>

          {/* Hidden clear button preserved for test compatibility */}
          <button
            id="btn-clear-chat"
            type="button"
            onClick={handleClearConversation}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main View: Hero View when 0 messages, or Message Stream when > 0 */}
      {messages.length === 0 ? (
        <div className="chat-hero-container chat-empty-state" id="chat-empty-state">
          {/* Centered AI Title & Subtitle */}
          <div className="chat-hero-header">
            <div className="chat-hero-star-wrapper">
              <img src={aiStarIcon} alt="EduGenie AI" className="chat-hero-star-img" />
            </div>
            <h1 className="chat-hero-title chat-empty-title">EduGenie AI</h1>
            <p className="chat-hero-subtitle chat-empty-subtitle">
              Build something amazing — just start typing below.
            </p>
          </div>

          {/* Centered Frosted Moon Chat Card */}
          <div className="chat-hero-card-wrapper">
            {renderChatBox()}
          </div>

          {/* Quick Action Suggestion Pills directly below the Card */}
          <div className="chat-hero-pills chat-examples-grid" aria-label="Suggested educational questions">
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chat-hero-pill chat-example-card"
                onClick={() => handleExampleClick(item.query)}
                aria-label={`Use example: ${item.label}`}
              >
                {item.icon}
                <span className="chat-example-text">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Messages Scroll Area */}
          <div
            className="chat-messages-container"
            tabIndex={0}
            aria-label="Conversation messages history"
          >
            <div className="chat-message-list">
              {messages.map((message) => {
                const isUser = message.role === 'user'
                const isEditing = isUser && editingMessageId === message.id
                const hasSources = Boolean(message.sources && message.sources.length > 0)

                return (
                  <div
                    key={message.id}
                    className={`chat-message-row ${isUser ? 'user-row' : 'assistant-row'}`}
                    id={`chat-message-${message.id}`}
                  >
                    {isUser ? (
                      isEditing ? (
                        <div className="chat-inline-edit-box">
                          <textarea
                            ref={editInputRef}
                            value={editingText}
                            onChange={(e) => {
                              setEditingText(e.target.value)
                              e.target.style.height = 'auto'
                              e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSaveEdit(message.id)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            className="chat-inline-edit-textarea"
                            placeholder="Edit your question..."
                            rows={2}
                          />
                          <div className="chat-inline-edit-footer">
                            <button
                              type="button"
                              className="chat-edit-cancel-btn"
                              onClick={handleCancelEdit}
                              aria-label="Cancel editing"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                            <button
                              type="button"
                              className="chat-edit-save-btn"
                              onClick={() => handleSaveEdit(message.id)}
                              disabled={!editingText.trim() || status === 'loading'}
                              aria-label="Send edited question"
                            >
                              <span>Save &amp; Submit</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="chat-user-message-container">
                          <div className="chat-bubble user-bubble">
                            <p className="chat-user-text">{message.content}</p>
                          </div>

                          {/* Hover action icons underneath user bubble (ChatGPT style) */}
                          <div className="chat-user-hover-actions">
                            <button
                              type="button"
                              className="chat-hover-icon-btn"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              title="Copy message"
                              aria-label="Copy your message"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="chat-hover-icon-btn"
                              onClick={() => handleStartEdit(message)}
                              title="Edit question"
                              aria-label="Edit this question"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="chat-bubble assistant-bubble">
                        {message.mode === 'research' && (
                          <div className="mb-2">
                            <span
                              className="chat-model-tag"
                              style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}
                            >
                              🌐 Research
                            </span>
                          </div>
                        )}

                        <div className="chat-bubble-content">
                          <SafeMarkdownRenderer content={message.content} />
                        </div>

                        {/* Sources Display for Web Research Answers */}
                        {hasSources && message.sources && (
                          <div className="chat-sources-container" data-testid="chat-sources-list">
                            <div className="chat-sources-header">
                              <span aria-hidden="true">🌐</span>
                              <span className="chat-sources-title">Sources</span>
                              <span className="chat-sources-badge">
                                {message.sources.length}
                              </span>
                            </div>
                            <div className="chat-sources-cards">
                              {message.sources.map((src, sIdx) => {
                                const isObj = typeof src === 'object' && src !== null
                                const title = isObj ? src.title : src
                                const url = isObj ? src.url : src
                                let domain = ''
                                try {
                                  domain = isObj ? src.domain || '' : new URL(url).hostname || ''
                                } catch {
                                  domain = ''
                                }
                                const snippet = isObj ? src.snippet : ''

                                return (
                                  <div
                                    key={`${url}-${sIdx}`}
                                    className="chat-source-item"
                                    data-testid="chat-source-card"
                                  >
                                    <div className="chat-source-top">
                                      <span className="chat-source-number">{sIdx + 1}.</span>
                                      <span className="chat-source-title">{title}</span>
                                      {domain && (
                                        <span className="chat-source-domain">{domain}</span>
                                      )}
                                    </div>
                                    {snippet && (
                                      <p className="chat-source-snippet">
                                        &ldquo;{snippet}&rdquo;
                                      </p>
                                    )}
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="chat-source-open-link"
                                      data-testid={`source-link-${sIdx}`}
                                    >
                                      <span>Open Source</span>
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </a>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div className="chat-bubble-actions">
                          <button
                            type="button"
                            className="chat-copy-btn"
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            aria-label="Copy answer to clipboard"
                          >
                            {copiedId === message.id ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Loading Indicator */}
              {status === 'loading' && (
                <div className="chat-message-row assistant-row" aria-live="polite">
                  <div className="chat-bubble assistant-bubble loading-bubble">
                    <div className="chat-loading-wrapper">
                      <span className="chat-loading-dots" aria-hidden="true">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </span>
                      <span className="chat-loading-text" data-testid="chat-loading-text">
                        {mode === 'research'
                          ? researchStep === 'searching'
                            ? 'Searching the web...'
                            : 'Analyzing sources...'
                          : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {status === 'error' && errorMessage && (
                <div className="chat-error-banner" role="alert" data-testid="chat-error-banner">
                  <div className="chat-error-content">
                    <span className="chat-error-icon" aria-hidden="true">
                      ⚠️
                    </span>
                    <span className="chat-error-message">{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    id="btn-retry-chat"
                    onClick={handleRetry}
                    className="moon-clear-btn"
                    aria-label="Retry sending question"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Docked Chat Input Box */}
          <div className="chat-input-wrapper docked">
            {renderChatBox()}
          </div>
        </>
      )}
    </div>
  )
}

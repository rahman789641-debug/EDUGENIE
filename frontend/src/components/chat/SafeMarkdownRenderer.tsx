import React, { useState } from 'react'

interface SafeMarkdownRendererProps {
  content: string
}

interface ParsedBlock {
  type: 'code' | 'heading' | 'list' | 'paragraph'
  text: string
  language?: string
  items?: string[]
  level?: number
}

function parseBlocks(raw: string): ParsedBlock[] {
  const lines = raw.split(/\r?\n/)
  const blocks: ParsedBlock[] = []

  let inCodeBlock = false
  let codeBuffer: string[] = []
  let codeLanguage = ''
  let currentList: string[] = []
  let currentParagraph: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join('\n').trim(),
      })
      currentParagraph = []
    }
  }

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({
        type: 'list',
        text: '',
        items: [...currentList],
      })
      currentList = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block boundary
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push({
          type: 'code',
          text: codeBuffer.join('\n'),
          language: codeLanguage || 'code',
        })
        codeBuffer = []
        codeLanguage = ''
        inCodeBlock = false
      } else {
        // Start code block
        flushParagraph()
        flushList()
        inCodeBlock = true
        codeLanguage = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      continue
    }

    // Bullet or numbered list items
    const listMatch = line.match(/^(\*|-|\d+\.)\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      currentList.push(listMatch[2].trim())
      continue
    }

    // Empty line separates paragraphs
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    // Normal line part of paragraph
    currentParagraph.push(line)
  }

  flushParagraph()
  flushList()

  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      type: 'code',
      text: codeBuffer.join('\n'),
      language: codeLanguage || 'code',
    })
  }

  return blocks
}

/**
 * Format inline bold and inline code safely as React DOM elements.
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Split on inline code (`...`) or bold (**...**)
  const parts: React.ReactNode[] = []
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`code-${match.index}`} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold-${match.index}`}>
          {token.slice(2, -2)}
        </strong>
      )
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="chat-code-block-container">
      <div className="chat-code-header">
        <span className="chat-code-lang">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="chat-code-copy-btn"
          aria-label="Copy code to clipboard"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="chat-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const SafeMarkdownRenderer: React.FC<SafeMarkdownRendererProps> = ({ content }) => {
  const blocks = parseBlocks(content)

  return (
    <div className="chat-markdown-body">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={`block-${idx}`} code={block.text} language={block.language} />
        }

        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4'
          return (
            <Tag key={`block-${idx}`} className={`chat-heading chat-h${block.level}`}>
              {renderInlineText(block.text)}
            </Tag>
          )
        }

        if (block.type === 'list' && block.items) {
          return (
            <ul key={`block-${idx}`} className="chat-list">
              {block.items.map((item, itemIdx) => (
                <li key={`item-${itemIdx}`} className="chat-list-item">
                  {renderInlineText(item)}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={`block-${idx}`} className="chat-paragraph">
            {renderInlineText(block.text)}
          </p>
        )
      })}
    </div>
  )
}

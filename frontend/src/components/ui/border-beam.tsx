import React from 'react'

export type BorderBeamSize = 'sm' | 'md' | 'lg' | 'xl' | number
export type BorderBeamTheme = 'light' | 'dark' | 'auto'
export type BorderBeamColorVariant =
  | 'colorful'
  | 'monochrome'
  | 'blue'
  | 'purple'
  | 'cyan'
  | string

export interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  size?: BorderBeamSize
  duration?: number
  borderWidth?: number
  borderRadius?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
  colorVariant?: BorderBeamColorVariant
  theme?: BorderBeamTheme
  active?: boolean
  className?: string
  style?: React.CSSProperties
}

const COLOR_GRADIENTS: Record<string, string> = {
  colorful:
    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 60deg, #06b6d4 120deg, #3b82f6 150deg, #8b5cf6 180deg, #ec4899 210deg, #06b6d4 240deg, transparent 300deg, transparent 360deg)',
  blue:
    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 60deg, #38bdf8 130deg, #2563eb 170deg, #60a5fa 210deg, transparent 270deg, transparent 360deg)',
  purple:
    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 60deg, #c084fc 130deg, #7c3aed 170deg, #ec4899 210deg, transparent 270deg, transparent 360deg)',
  cyan:
    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 60deg, #22d3ee 130deg, #0284c7 170deg, #38bdf8 210deg, transparent 270deg, transparent 360deg)',
  monochrome:
    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 60deg, rgba(255,255,255,0.85) 160deg, rgba(255,255,255,0.2) 200deg, transparent 260deg, transparent 360deg)',
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  size = 'md',
  duration = 4,
  borderWidth = 2,
  borderRadius = 16,
  colorVariant = 'colorful',
  active,
  className = '',
  style,
  ...props
}) => {
  const gradient = COLOR_GRADIENTS[colorVariant] || COLOR_GRADIENTS.colorful

  let beamThickness = borderWidth
  if (typeof size === 'number') {
    beamThickness = size
  } else if (size === 'sm') {
    beamThickness = 1.25
  } else if (size === 'md') {
    beamThickness = 2
  } else if (size === 'lg') {
    beamThickness = 2.5
  } else if (size === 'xl') {
    beamThickness = 3
  }

  const isBeamActive = active !== undefined ? active : undefined

  return (
    <div
      className={`border-beam-container ${isBeamActive ? 'border-beam-active' : ''} ${className}`}
      style={{
        position: 'relative',
        borderRadius: `${borderRadius}px`,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {/* Strict Border Perimeter: Center is 100% masked out so light ONLY shines on border */}
      <div
        className="border-beam-border-track"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: `${borderRadius}px`,
          padding: `${beamThickness}px`,
          pointerEvents: 'none',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          overflow: 'hidden',
          zIndex: 4,
          opacity: isBeamActive === undefined ? undefined : isBeamActive ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          className="border-beam-spinner"
          style={{
            position: 'absolute',
            top: '-150%',
            left: '-150%',
            width: '400%',
            height: '400%',
            background: gradient,
            animation: `border-beam-spin ${duration}s linear infinite`,
          }}
        />
      </div>

      {/* Inner Content Wrapper */}
      <div
        className="border-beam-content"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: `${borderRadius}px`,
          zIndex: 2,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default BorderBeam

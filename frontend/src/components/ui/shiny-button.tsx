import type React from 'react'
import { useId, useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQueryList.addEventListener('change', callback)
  return () => mediaQueryList.removeEventListener('change', callback)
}

function getServerReducedMotionSnapshot() {
  return false
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    getServerReducedMotionSnapshot,
  )
}

export interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  children?: React.ReactNode
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  fillColor?: string
  labelColor?: string
  accentColor?: string
  accentSoftColor?: string
  sweepDuration?: number
  easeDuration?: number
  arcWidth?: number
  cornerRadius?: number
  showSpeckle?: boolean
  showSheen?: boolean
  speckleOpacity?: number
  size?: 'default' | 'sm' | 'icon' | 'pill'
}

export function ShinyButton({
  label = 'Get Started',
  children,
  onClick,
  className = '',
  fillColor = '#000000',
  labelColor = '#ffffff',
  accentColor = '#ff5f00',
  accentSoftColor = '#ff9253',
  sweepDuration = 3,
  easeDuration = 0.8,
  arcWidth = 5,
  cornerRadius = 32,
  showSpeckle = true,
  showSheen = true,
  speckleOpacity = 0.4,
  size = 'default',
  disabled = false,
  type = 'button',
  style,
  ...props
}: ShinyButtonProps) {
  const reducedMotion = usePrefersReducedMotion()
  const rawId = useId()
  const instanceId = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const scope = `gleam-edge-${instanceId}`

  // Sizing variants
  let defaultPadding = '1.25rem 2.5rem'
  let defaultFontSize = '1.125rem'
  let defaultDisplay = 'inline-flex'
  let defaultAlign = 'center'
  let defaultJustify = 'center'
  let defaultHeight: string | undefined = undefined
  let defaultWidth: string | undefined = undefined

  if (size === 'icon') {
    defaultPadding = '0'
    defaultFontSize = '0.875rem'
    defaultWidth = '34px'
    defaultHeight = '34px'
  } else if (size === 'sm' || size === 'pill') {
    defaultPadding = '0.35rem 0.85rem'
    defaultFontSize = '0.8125rem'
  }

  const css = `
    @property --gradient-angle-${instanceId} {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @property --gradient-angle-offset-${instanceId} {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @property --gradient-percent-${instanceId} {
      syntax: "<percentage>";
      initial-value: ${arcWidth}%;
      inherits: false;
    }
    @property --gradient-shine-${instanceId} {
      syntax: "<color>";
      initial-value: white;
      inherits: false;
    }

    .${scope} {
      --gleam-base: ${fillColor};
      --gleam-inset: #1a1818;
      --gleam-label: ${labelColor};
      --gleam-accent: ${accentColor};
      --gleam-accent-soft: ${accentSoftColor};
      --animation: gradient-angle-${instanceId} linear infinite;
      --duration: ${sweepDuration}s;
      --shadow-size: 2px;
      --transition: ${easeDuration}s cubic-bezier(0.25, 1, 0.5, 1);

      isolation: isolate;
      position: relative;
      overflow: hidden;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      outline-offset: 4px;
      padding: var(--shiny-padding, ${defaultPadding}) !important;
      font-size: var(--shiny-font-size, ${defaultFontSize}) !important;
      line-height: 1.2 !important;
      font-weight: 500 !important;
      border: 1px solid transparent !important;
      border-radius: ${cornerRadius}px !important;
      color: var(--gleam-label) !important;
      display: ${defaultDisplay} !important;
      align-items: ${defaultAlign} !important;
      justify-content: ${defaultJustify} !important;
      ${defaultWidth ? `width: ${defaultWidth} !important; min-width: ${defaultWidth} !important;` : ''}
      ${defaultHeight ? `height: ${defaultHeight} !important; min-height: ${defaultHeight} !important;` : ''}
      background:
        linear-gradient(var(--gleam-base), var(--gleam-base)) padding-box,
        conic-gradient(
          from calc(var(--gradient-angle-${instanceId}) - var(--gradient-angle-offset-${instanceId})),
          transparent,
          var(--gleam-accent) var(--gradient-percent-${instanceId}),
          var(--gradient-shine-${instanceId}) calc(var(--gradient-percent-${instanceId}) * 2),
          var(--gleam-accent) calc(var(--gradient-percent-${instanceId}) * 3),
          transparent calc(var(--gradient-percent-${instanceId}) * 4)
        ) border-box !important;
      box-shadow: inset 0 0 0 1px var(--gleam-inset) !important;
      transition: var(--transition) !important;
      transition-property:
        --gradient-angle-offset-${instanceId},
        --gradient-percent-${instanceId},
        --gradient-shine-${instanceId} !important;
      opacity: ${disabled ? '0.45' : '1'} !important;
    }

    .${scope}::before,
    .${scope}::after,
    .${scope} span::before {
      content: "";
      pointer-events: none;
      position: absolute;
      inset-inline-start: 50%;
      inset-block-start: 50%;
      translate: -50% -50%;
      z-index: -1;
    }

    .${scope}:active:not(:disabled) {
      translate: 0 1px;
    }

    .${scope}::before {
      --size: calc(100% - var(--shadow-size) * 3);
      --position: 2px;
      --space: calc(var(--position) * 2);
      width: var(--size);
      height: var(--size);
      background: radial-gradient(
        circle at var(--position) var(--position),
        white calc(var(--position) / 4),
        transparent 0
      ) padding-box;
      background-size: var(--space) var(--space);
      background-repeat: space;
      mask-image: conic-gradient(
        from calc(var(--gradient-angle-${instanceId}) + 45deg),
        black,
        transparent 10% 90%,
        black
      );
      border-radius: inherit;
      opacity: ${showSpeckle ? speckleOpacity : 0};
      z-index: -1;
    }

    .${scope}::after {
      --animation: shimmer-${instanceId} linear infinite;
      width: 100%;
      aspect-ratio: 1;
      background: linear-gradient(
        -50deg,
        transparent,
        var(--gleam-accent),
        transparent
      );
      mask-image: radial-gradient(circle at bottom, transparent 40%, black);
      opacity: ${showSheen ? 0.6 : 0};
    }

    .${scope} span {
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
    }

    .${scope} span::before {
      --size: calc(100% + 1rem);
      width: var(--size);
      height: var(--size);
      box-shadow: inset 0 -1ex 2rem 4px var(--gleam-accent);
      opacity: 0;
      transition: opacity var(--transition);
      animation: calc(var(--duration) * 1.5) breathe-${instanceId} linear infinite;
    }

    .${scope},
    .${scope}::before,
    .${scope}::after {
      animation:
        var(--animation) var(--duration),
        var(--animation) calc(var(--duration) / 0.4) reverse paused;
      animation-composition: add;
    }

    .${scope}:is(:hover, :focus-visible, .active):not(:disabled) {
      --gradient-percent-${instanceId}: 20% !important;
      --gradient-angle-offset-${instanceId}: 95deg !important;
      --gradient-shine-${instanceId}: var(--gleam-accent-soft) !important;
    }

    .${scope}:is(:hover, :focus-visible, .active):not(:disabled),
    .${scope}:is(:hover, :focus-visible, .active):not(:disabled)::before,
    .${scope}:is(:hover, :focus-visible, .active):not(:disabled)::after {
      animation-play-state: running !important;
    }

    .${scope}:is(:hover, :focus-visible, .active):not(:disabled) span::before {
      opacity: 1 !important;
    }

    @keyframes gradient-angle-${instanceId} {
      to {
        --gradient-angle-${instanceId}: 360deg;
      }
    }

    @keyframes shimmer-${instanceId} {
      to {
        rotate: 360deg;
      }
    }

    @keyframes breathe-${instanceId} {
      from,
      to {
        scale: 1;
      }
      50% {
        scale: 1.2;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .${scope},
      .${scope}::before,
      .${scope}::after,
      .${scope} span::before {
        animation: none !important;
      }

      .${scope}:is(:hover, :focus-visible)::before,
      .${scope}:is(:hover, :focus-visible)::after {
        animation-play-state: paused !important;
      }

      .${scope}:is(:hover, :focus-visible) span::before {
        opacity: 0 !important;
      }

      .${scope} {
        transition: none !important;
      }
    }
  `

  return (
    <>
      <style>{css}</style>
      <button
        type={type}
        className={`${scope} ${className}`}
        onClick={disabled ? undefined : onClick}
        aria-label={label || (props['aria-label'] as string)}
        disabled={disabled}
        data-reduced-motion={reducedMotion ? 'true' : undefined}
        style={style}
        {...props}
      >
        <span>{children ?? label}</span>
      </button>
    </>
  )
}

export default ShinyButton

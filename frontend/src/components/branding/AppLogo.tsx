import React from 'react'
import logoFull from '../../assets/edugenie-logo.png'
import logoFullLight from '../../assets/edugenie-logo-light.png'
import logoNav from '../../assets/edugenie-logo-nav.png'
import logoNavLight from '../../assets/edugenie-logo-nav-light.png'
import logoHorizontal from '../../assets/edugenie-logo-horizontal.png'
import logoHorizontalLight from '../../assets/edugenie-logo-horizontal-light.png'
import logoIcon from '../../assets/edugenie-icon.png'

export interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showTagline?: boolean
  variant?: 'auto' | 'horizontal' | 'stacked' | 'icon'
  className?: string
  style?: React.CSSProperties
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  variant = 'auto',
  className = '',
  style = {},
}) => {
  // Determine size dimensions
  const heights = {
    sm: { text: 26, icon: 26, stacked: 56 },
    md: { text: 34, icon: 34, stacked: 76 },
    lg: { text: 48, icon: 60, stacked: 104 },
    xl: { text: 64, icon: 80, stacked: 140 },
  }[size]

  // Decide which image sources to display based on props
  let darkSrc = logoIcon
  let lightSrc = logoIcon
  let targetHeight = heights.icon
  const isPureIcon = !showText || variant === 'icon'

  if (isPureIcon) {
    darkSrc = logoIcon
    lightSrc = logoIcon
    targetHeight = heights.icon
  } else if (variant === 'stacked') {
    darkSrc = logoFull
    lightSrc = logoFullLight
    targetHeight = heights.stacked
  } else {
    // Horizontal brand lockup
    darkSrc = showTagline ? logoHorizontal : logoNav
    lightSrc = showTagline ? logoHorizontalLight : logoNavLight
    targetHeight = heights.text
  }

  const imgStyle: React.CSSProperties = {
    height: `${targetHeight}px`,
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 10px rgba(56, 189, 248, 0.2))',
    transition: 'transform 0.2s ease, filter 0.2s ease',
  }

  return (
    <div
      className={`app-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        lineHeight: 0,
        ...style,
      }}
    >
      {isPureIcon ? (
        <img
          src={darkSrc}
          alt="EduGenie Logo"
          style={{ ...imgStyle, display: 'block' }}
        />
      ) : (
        <>
          <img
            src={darkSrc}
            alt="EduGenie Logo"
            className="app-logo-dark"
            style={imgStyle}
          />
          <img
            src={lightSrc}
            alt="EduGenie Logo"
            className="app-logo-light"
            style={imgStyle}
          />
        </>
      )}
    </div>
  )
}

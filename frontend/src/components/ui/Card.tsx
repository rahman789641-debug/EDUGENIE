import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  hoverable = false,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`ui-card ${hoverable ? 'hoverable' : ''} ${className}`}
      style={style}
      {...props}
    >
      {(title || action) && (
        <div className="ui-card-header">
          <div>
            {title && <h3 className="ui-card-title">{title}</h3>}
            {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="ui-card-body">{children}</div>
    </div>
  )
}

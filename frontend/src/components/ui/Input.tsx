import React, { useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  rightAction?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  rightAction,
  id,
  className = '',
  ...props
}) => {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label}</span>
          {rightAction && <span>{rightAction}</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className="form-error-text" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className="form-helper-text">
          {helperText}
        </span>
      )}
    </div>
  )
}

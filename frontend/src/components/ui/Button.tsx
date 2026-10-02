import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'btn btn-primary bg-primary text-primary-foreground hover:bg-primary/90',
        primary: 'btn btn-primary',
        destructive: 'btn btn-danger bg-destructive text-destructive-foreground hover:bg-destructive/90',
        danger: 'btn btn-danger',
        outline: 'btn btn-outline border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'btn btn-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'btn btn-ghost hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'btn-md h-10 px-4 py-2',
        sm: 'btn-sm h-9 rounded-md px-3',
        md: 'btn-md h-10 px-4 py-2',
        lg: 'btn-lg h-11 rounded-md px-8',
        icon: 'btn-icon h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      fullWidth = false,
      disabled,
      className = '',
      style,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const combinedClassName = cn(
      buttonVariants({ variant, size }),
      loading && 'btn-loading',
      className,
    )

    return (
      <Comp
        ref={ref}
        className={combinedClassName}
        disabled={disabled || loading}
        style={{
          width: fullWidth ? '100%' : undefined,
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <span
            className="animate-spin"
            style={{
              width: size === 'sm' ? '12px' : '16px',
              height: size === 'sm' ? '12px' : '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
        ) : (
          icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
        )}
        {typeof children === 'string' ? <span>{children}</span> : children}
      </Comp>
    )
  },
)

Button.displayName = 'Button'
export default Button

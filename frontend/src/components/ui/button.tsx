import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a96e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b] disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#c9a96e] to-[#e8d5b5] text-[#07070b] hover:from-[#b8956a] hover:to-[#d4c4a8] shadow-lg shadow-black/30',
        outline:
          'border border-white/[0.1] bg-transparent text-white hover:bg-white/[0.04] hover:border-[#c9a96e]/40',
        ghost:
          'bg-transparent text-[#8b8fa8] hover:bg-white/[0.04] hover:text-white',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30',
        secondary:
          'bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08]',
        link: 'text-[#c9a96e] underline-offset-4 hover:underline bg-transparent p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

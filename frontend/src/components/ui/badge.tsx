import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/[0.06] text-[#8b8fa8] border border-white/[0.08]',
        gold: 'bg-[#c9a96e]/15 text-[#e8d5b5] border border-[#c9a96e]/30',
        purple: 'bg-[#c9a96e]/15 text-[#e8d5b5] border border-[#c9a96e]/30',
        green: 'bg-green-900/40 text-green-300 border border-green-700/50',
        red: 'bg-red-900/40 text-red-300 border border-red-700/50',
        yellow: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
        blue: 'bg-blue-900/40 text-blue-300 border border-blue-700/50',
        outline: 'bg-transparent text-white border border-white/[0.08]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

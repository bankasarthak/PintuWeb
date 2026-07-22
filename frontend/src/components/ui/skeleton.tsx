import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangle' | 'circle' | 'text'
}

export function Skeleton({ className, variant = 'rectangle', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#1e1e2e]',
        variant === 'circle' && 'rounded-full',
        variant === 'rectangle' && 'rounded-xl',
        variant === 'text' && 'rounded h-4',
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6', className)}>
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton variant="text" className="mb-2" />
      <Skeleton variant="text" className="w-2/3" />
    </div>
  )
}

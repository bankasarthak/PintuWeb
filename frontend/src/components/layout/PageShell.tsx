'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { cn } from '@/lib/utils'

export function PageShell({
  title,
  subtitle,
  backHref,
  children,
  className,
  maxWidth = '3xl',
}: {
  title: string
  subtitle?: string
  backHref?: string
  children: React.ReactNode
  className?: string
  maxWidth?: '2xl' | '3xl' | '4xl' | '7xl'
}) {
  const max = { '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl', '7xl': 'max-w-7xl' }[maxWidth]

  return (
    <div className="min-h-screen bg-[#07070b]">
      <AppHeader title={title} subtitle={subtitle} />
      <div className={cn('mx-auto px-4 py-6', max, className)}>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8b8fa8] hover:text-[#e8d5b5] transition-colors mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        )}
        {children}
      </div>
    </div>
  )
}

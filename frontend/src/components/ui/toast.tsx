'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'

const iconMap = {
  success: <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />,
}

const borderMap = {
  success: 'border-green-700/50',
  error: 'border-red-700/50',
  info: 'border-blue-700/50',
  warning: 'border-yellow-700/50',
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-xl border bg-[#13131a]/95 backdrop-blur-xl p-4 shadow-xl',
            'animate-in slide-in-from-right-full duration-300',
            borderMap[toast.type]
          )}
          role="alert"
        >
          {iconMap[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-[#94a3b8] mt-0.5 break-words">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#94a3b8] hover:text-white transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

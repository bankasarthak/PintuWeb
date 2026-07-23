'use client'

import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SourcePhotoUpload({
  file,
  preview,
  onChange,
  label = 'Source photo',
  hint = 'Upload a clear face photo — used as the video source.',
}: {
  file: File | null
  preview: string | null
  onChange: (file: File | null, preview: string | null) => void
  label?: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#e8e4dc]">{label}</p>
      <p className="text-xs text-[#8b8fa8] leading-relaxed">{hint}</p>
      {preview ? (
        <div className="relative aspect-[4/5] max-w-xs rounded-2xl overflow-hidden border border-white/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Source preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full max-w-xs aspect-[4/5] rounded-2xl border border-dashed border-white/[0.12]',
            'bg-white/[0.02] hover:border-[#c9a96e]/35 hover:bg-[#c9a96e]/5 transition-all',
            'flex flex-col items-center justify-center gap-3 text-[#8b8fa8]'
          )}
        >
          <div className="h-12 w-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <Upload className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium">Upload photo</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          onChange(f, URL.createObjectURL(f))
        }}
      />
    </div>
  )
}

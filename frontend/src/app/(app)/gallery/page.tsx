'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2, ImageIcon, Film, Play } from 'lucide-react'
import { galleryApi } from '@/lib/api'
import { useCharacters } from '@/hooks/useCharacters'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type MediaFilter = 'all' | 'photo' | 'video'

export default function GalleryPage() {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [characterFilter, setCharacterFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const { data: characters } = useCharacters()
  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['gallery', 'global', characterFilter, mediaFilter],
    queryFn: () =>
      galleryApi.list(
        characterFilter === 'all' ? undefined : characterFilter,
        mediaFilter === 'all' ? undefined : mediaFilter
      ),
  })

  const { mutate: deleteItem, isPending: deleting } = useMutation({
    mutationFn: (id: string) => galleryApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] })
      success('Deleted', 'Media item deleted')
      setDeleteId(null)
    },
    onError: (err) => {
      toastError('Failed to delete', getApiErrorMessage(err))
    },
  })

  const items = galleryData?.items ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Gallery</h1>
        <p className="text-[#94a3b8] mt-1">
          {galleryData?.total ?? 0} items in your collection
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'photo', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setMediaFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                mediaFilter === f
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
              )}
              aria-pressed={mediaFilter === f}
            >
              {f === 'photo' ? '📷 Photos' : f === 'video' ? '🎬 Videos' : 'All'}
            </button>
          ))}
        </div>

        {/* Companion filter */}
        {characters && characters.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCharacterFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex-shrink-0',
                characterFilter === 'all'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
              )}
              aria-pressed={characterFilter === 'all'}
            >
              All companions
            </button>
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setCharacterFilter(c.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex-shrink-0',
                  characterFilter === c.id
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
                )}
                aria-pressed={characterFilter === c.id}
              >
                {c.name || 'Unnamed'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className={cn('break-inside-avoid', i % 3 === 0 ? 'h-64' : 'h-48')} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="h-20 w-20 rounded-2xl bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center mx-auto mb-5">
            <ImageIcon className="h-10 w-10 text-[#94a3b8]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No media yet</h3>
          <p className="text-sm text-[#94a3b8] max-w-sm mx-auto">
            Generate photos and videos in your companion&apos;s Create tab to see them here
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative break-inside-avoid rounded-xl overflow-hidden border border-[#1e1e2e] group bg-[#13131a]"
            >
              <div className="relative overflow-hidden">
                <div className="blur-sm group-hover:blur-none transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={`Generated ${item.media_type}`}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {item.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <a
                    href={item.url}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 rounded-lg bg-[#13131a]/80 flex items-center justify-center text-white hover:bg-[#1e1e2e] transition-colors"
                    aria-label="Download media"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="h-8 w-8 rounded-lg bg-red-900/80 flex items-center justify-center text-red-300 hover:bg-red-700 transition-colors"
                    aria-label="Delete media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-2 flex items-center justify-between">
                <Badge variant={item.media_type === 'video' ? 'blue' : 'purple'} className="text-[10px]">
                  {item.media_type === 'video' ? (
                    <Film className="h-2.5 w-2.5 mr-1" />
                  ) : (
                    <ImageIcon className="h-2.5 w-2.5 mr-1" />
                  )}
                  {item.media_type}
                </Badge>
                <span className="text-[10px] text-[#94a3b8]">{formatRelativeTime(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteItem(deleteId)}
        title="Delete this item?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  )
}

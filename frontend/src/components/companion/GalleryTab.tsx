'use client'

import { useState } from 'react'
import { Download, Trash2, Play, ImageIcon, Film } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi } from '@/lib/api'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface GalleryTabProps {
  characterId: string
}

type Filter = 'all' | 'photo' | 'video'

export function GalleryTab({ characterId }: GalleryTabProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['gallery', characterId, filter],
    queryFn: () => galleryApi.list(characterId, filter === 'all' ? undefined : filter),
  })

  const { mutate: deleteItem, isPending: deleting } = useMutation({
    mutationFn: (id: string) => galleryApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery', characterId] })
      success('Deleted', 'Media item deleted')
      setDeleteId(null)
    },
    onError: (err) => {
      toastError('Failed to delete', getApiErrorMessage(err))
    },
  })

  const items = galleryData?.items ?? []

  return (
    <div className="p-6">
      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {(['all', 'photo', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
              filter === f
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
            )}
            aria-pressed={filter === f}
          >
            {f === 'all' ? 'All' : f === 'photo' ? '📷 Photos' : '🎬 Videos'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-[#94a3b8]" />
          </div>
          <h3 className="font-semibold text-white mb-1">No media yet</h3>
          <p className="text-sm text-[#94a3b8]">
            Generate photos and videos in the Create tab to see them here
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
                {/* Blurred thumbnail */}
                <div className="blur-sm group-hover:blur-none transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={`Generated ${item.media_type}`}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Video indicator */}
                {item.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
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

              {/* Footer */}
              <div className="p-2 flex items-center justify-between">
                <Badge variant={item.media_type === 'video' ? 'blue' : 'purple'} className="text-[10px]">
                  {item.media_type === 'video' ? (
                    <Film className="h-2.5 w-2.5 mr-1" />
                  ) : (
                    <ImageIcon className="h-2.5 w-2.5 mr-1" />
                  )}
                  {item.media_type}
                </Badge>
                <span className="text-[10px] text-[#94a3b8]">
                  {formatRelativeTime(item.created_at)}
                </span>
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

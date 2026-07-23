'use client'

import { useState } from 'react'
import { Download, Trash2, ImageIcon, Film } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi } from '@/lib/api'
import { AuthenticatedMedia } from '@/components/shared/AuthenticatedMedia'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage, formatRelativeTime, isVideoJobType, galleryMediaUrl } from '@/lib/utils'
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
    queryFn: () => galleryApi.list(characterId),
  })

  const items = (galleryData?.items ?? []).filter((item) => {
    if (filter === 'all') return true
    const video = isVideoJobType(item.job_type)
    return filter === 'video' ? video : !video
  })

  const { mutate: deleteItem, isPending: deleting } = useMutation({
    mutationFn: (id: string) => galleryApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] })
      success('Deleted', 'Media item deleted')
      setDeleteId(null)
    },
    onError: (err) => toastError('Failed to delete', getApiErrorMessage(err)),
  })

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        {(['all', 'photo', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
              filter === f
                ? 'bg-[#c9a96e]/10 border-[#c9a96e]/40 text-[#e8d5b5]'
                : 'border-white/[0.08] text-[#8b8fa8] hover:text-white'
            )}
          >
            {f === 'all' ? 'All' : f + 's'}
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
          <ImageIcon className="h-10 w-10 text-[#8b8fa8] mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-1">No media yet</h3>
          <p className="text-sm text-[#8b8fa8]">Generate from Create to see results here</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {items.map((item) => {
            const video = isVideoJobType(item.job_type)
            return (
              <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden border border-white/[0.08] group">
                <div className="relative">
                  <AuthenticatedMedia jobId={item.id} alt="Media" isVideo={video} className="w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 pointer-events-none group-hover:pointer-events-auto">
                    <button
                      className="h-8 w-8 rounded-lg bg-black/60 flex items-center justify-center text-white"
                      onClick={async () => {
                        const token = localStorage.getItem('access_token')
                        const res = await fetch(galleryMediaUrl(item.id), { headers: { Authorization: `Bearer ${token}` } })
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `pintu-${item.id}`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="h-8 w-8 rounded-lg bg-red-900/70 flex items-center justify-center text-red-200">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2 flex items-center justify-between bg-white/[0.02]">
                  <Badge variant={video ? 'blue' : 'purple'} className="text-[10px]">
                    {video ? <Film className="h-2.5 w-2.5 mr-1" /> : <ImageIcon className="h-2.5 w-2.5 mr-1" />}
                    {video ? 'video' : 'photo'}
                  </Badge>
                  <span className="text-[10px] text-[#8b8fa8]">{formatRelativeTime(item.created_at)}</span>
                </div>
              </div>
            )
          })}
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

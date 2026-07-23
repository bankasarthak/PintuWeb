'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Trash2, ImageIcon, Film, Loader2, Clock } from 'lucide-react'
import { galleryApi } from '@/lib/api'
import { useJobs } from '@/hooks/useGenerate'
import { PageShell } from '@/components/layout/PageShell'
import { AuthenticatedMedia } from '@/components/shared/AuthenticatedMedia'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage, formatRelativeTime, isVideoJobType, galleryMediaUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

type Filter = 'all' | 'photo' | 'video'

const ACTIVE_STATUSES = new Set(['queued', 'claimed', 'processing'])
const MINUTES_PER_JOB = 3

function estimateEtaMinutes(job: Job, queueIndex: number): number | null {
  if (job.status === 'processing' || job.status === 'claimed') return MINUTES_PER_JOB
  if (job.status === 'queued') return (queueIndex + 1) * MINUTES_PER_JOB
  return null
}

function ActiveJobCard({ job, queueIndex }: { job: Job; queueIndex: number }) {
  const eta = estimateEtaMinutes(job, queueIndex)
  const video = isVideoJobType(job.job_type)
  const statusLabel =
    job.status === 'processing' ? 'Rendering…' :
    job.status === 'claimed' ? 'Starting…' : 'Queued'

  return (
    <div className="rounded-xl border border-[#c9a96e]/25 bg-[#c9a96e]/5 p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
        {job.status === 'processing' || job.status === 'claimed' ? (
          <Loader2 className="h-5 w-5 text-[#c9a96e] animate-spin" />
        ) : (
          <Clock className="h-5 w-5 text-[#c9a96e]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="gold" className="text-[10px] capitalize">
            {video ? 'video' : 'photo'}
          </Badge>
          <span className="text-xs text-[#e8d5b5] font-medium">{statusLabel}</span>
          {job.scene_id && (
            <span className="text-[10px] text-[#8b8fa8] truncate">{job.scene_id.replace(/_/g, ' ')}</span>
          )}
        </div>
        {eta != null && (
          <p className="text-[11px] text-[#c9a96e] mt-2 font-medium">
            ~{eta} min remaining
          </p>
        )}
      </div>
    </div>
  )
}

export default function GalleryPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const jobType = filter === 'photo' ? undefined : filter === 'video' ? 'i2v' : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', filter],
    queryFn: () => galleryApi.list(undefined, jobType as 'i2v' | undefined),
  })

  const { data: jobsData } = useJobs(undefined, 1, { poll: true })

  const activeJobs = useMemo(() => {
    const all = jobsData?.items ?? []
    return all
      .filter((j) => ACTIVE_STATUSES.has(j.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [jobsData?.items])

  const items = (data?.items ?? []).filter((item) => {
    if (filter === 'all') return true
    const video = isVideoJobType(item.job_type)
    return filter === 'video' ? video : !video
  })

  const { mutate: deleteItem, isPending: deleting } = useMutation({
    mutationFn: (id: string) => galleryApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] })
      success('Deleted', 'Removed from gallery')
      setDeleteId(null)
    },
    onError: (err) => toastError('Failed', getApiErrorMessage(err)),
  })

  return (
    <PageShell title="Gallery" subtitle={`${data?.total ?? 0} creations`} maxWidth="7xl">
      {activeJobs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b8fa8] mb-3">
            In progress ({activeJobs.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map((job, index) => (
              <ActiveJobCard key={job.id} job={job} queueIndex={index} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'photo', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors',
              filter === f
                ? 'border-[#c9a96e]/40 bg-[#c9a96e]/10 text-[#e8d5b5]'
                : 'border-white/[0.08] text-[#8b8fa8] hover:text-white'
            )}
          >
            {f === 'all' ? 'All' : f + 's'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 break-inside-avoid rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 && activeJobs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-white/[0.08]">
          <ImageIcon className="h-10 w-10 text-[#8b8fa8] mx-auto mb-3" />
          <p className="text-white font-medium">No creations yet</p>
          <p className="text-sm text-[#8b8fa8] mt-1">Generate from Video to fill your gallery</p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#8b8fa8] text-center py-8">No completed creations in this filter yet.</p>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {items.map((item) => {
            const video = isVideoJobType(item.job_type)
            return (
              <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02] group">
                <div className="relative bg-black">
                  <AuthenticatedMedia
                    jobId={item.id}
                    alt="Creation"
                    isVideo={video}
                    className={video ? 'w-full h-auto' : 'w-full object-cover min-h-[120px]'}
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                      aria-label="Download"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const token = localStorage.getItem('access_token')
                        const res = await fetch(galleryMediaUrl(item.id), { headers: { Authorization: `Bearer ${token}` } })
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `pintu-${item.id}${video ? '.mp4' : '.jpg'}`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(item.id) }}
                      className="h-8 w-8 rounded-lg bg-red-900/80 flex items-center justify-center text-red-200 hover:bg-red-900"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <Badge variant={video ? 'blue' : 'gold'} className="text-[10px]">
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
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </PageShell>
  )
}

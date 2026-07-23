'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateJob, useStories, useStoryDetail } from '@/hooks/useGenerate'
import { cn } from '@/lib/utils'

function storySessionKey(userSuffix: string) {
  return `pintu-story-session-${userSuffix}`
}

export default function VideoStoryPage() {
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({
    file: null,
    preview: null,
  })
  const [storyId, setStoryId] = useState<string | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)

  const { data: stories, isLoading: storiesLoading, isError: storiesError } = useStories()
  const { data: story, isLoading: detailLoading, isError: detailError } = useStoryDetail(storyId)
  const { mutate: createJob, isPending } = useCreateJob()

  // Restore scene progress per story (matches Mini App localStorage behavior)
  useEffect(() => {
    if (!storyId) return
    try {
      const raw = localStorage.getItem(storySessionKey(storyId))
      if (raw) {
        const parsed = JSON.parse(raw) as { sceneIdx?: number }
        if (typeof parsed.sceneIdx === 'number') setSceneIdx(parsed.sceneIdx)
      }
    } catch {
      /* ignore */
    }
  }, [storyId])

  useEffect(() => {
    if (!storyId || !story) return
    localStorage.setItem(storySessionKey(storyId), JSON.stringify({ sceneIdx }))
  }, [storyId, story, sceneIdx])

  const scene = story?.scenes?.[sceneIdx]

  return (
    <PageShell title="Story Mode" subtitle="Animate her fate, chapter by chapter" backHref="/video">
      <SourcePhotoUpload
        file={source.file}
        preview={source.preview}
        onChange={(f, p) => setSource({ file: f, preview: p })}
      />

      {!storyId ? (
        <div className="grid gap-3 mt-8">
          {storiesLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          {storiesError && (
            <p className="text-sm text-red-400 text-center py-8">Failed to load stories. Is the API tunnel running?</p>
          )}
          {(stories ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStoryId(s.id)
                setSceneIdx(0)
              }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left hover:border-[#c9a96e]/30 transition-all"
            >
              <div className="flex items-start gap-3">
                {s.emoji ? <span className="text-2xl">{s.emoji}</span> : null}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-display text-base font-semibold text-white">{s.title}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#c9a96e] bg-[#c9a96e]/10 px-2 py-0.5 rounded-full">
                      {s.scene_count} scenes
                    </span>
                  </div>
                  <p className="text-xs text-[#8b8fa8] mt-1">{s.teaser}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : detailLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      ) : detailError || !story || !scene ? (
        <p className="text-sm text-red-400 text-center py-8 mt-8">Could not load this story.</p>
      ) : (
        <div className="mt-8 space-y-5">
          <div>
            <p className="font-display text-lg text-white">
              {story.emoji ? `${story.emoji} ` : ''}
              {story.title}
            </p>
            <p className="text-xs text-[#c9a96e] mt-1 font-medium">
              Scene {sceneIdx + 1} of {story.scene_count} · {scene.title}
            </p>
            {(scene.description || scene.subtitle) && (
              <p className="text-sm text-[#8b8fa8] mt-3 leading-relaxed">
                {scene.description || scene.subtitle}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8b8fa8] mb-3">
              Choose what happens next
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scene.beats.map((beat) => (
                <button
                  key={beat.id}
                  type="button"
                  disabled={!source.file || isPending}
                  onClick={() => {
                    if (!source.file) return
                    createJob(
                      {
                        job_type: 'i2v',
                        template_id: beat.template_id,
                        source_image: source.file,
                      },
                      {
                        onSuccess: (j) => {
                          setJobId(j.id)
                          if (sceneIdx < story.scene_count - 1) {
                            setSceneIdx((i) => i + 1)
                          }
                        },
                      }
                    )
                  }}
                  className={cn(
                    'rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all',
                    'border-white/[0.08] bg-white/[0.02] text-[#c4c0b8]',
                    'hover:border-[#c9a96e]/40 hover:bg-[#c9a96e]/5',
                    'disabled:opacity-40 disabled:pointer-events-none'
                  )}
                >
                  {beat.label}
                </button>
              ))}
            </div>
          </div>

          {!source.file && (
            <p className="text-xs text-amber-200/80 text-center">Upload a source photo above to unlock scene options.</p>
          )}

          <p className="text-xs text-[#8b8fa8] text-center">5 credits per scene · same templates as Telegram</p>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[#8b8fa8]"
            onClick={() => {
              setStoryId(null)
              setSceneIdx(0)
            }}
          >
            ← Pick another story
          </Button>
        </div>
      )}

      <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
    </PageShell>
  )
}

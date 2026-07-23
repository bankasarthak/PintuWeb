'use client'

import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { OptionGrid } from '@/components/generate/OptionGrid'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { useScenes, useMoods, useCreateJob } from '@/hooks/useGenerate'
import { CREDIT_COSTS } from '@/lib/catalogs'
import { cn } from '@/lib/utils'
import type { SceneItem } from '@/types'

export default function VideoScenePage() {
  const { data: scenes } = useScenes()
  const { data: moods } = useMoods()
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null })
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [moodId, setMoodId] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  const categories = useMemo(() => {
    const cats = new Set((scenes ?? []).map((s) => s.category))
    return ['all', ...Array.from(cats)]
  }, [scenes])
  const [cat, setCat] = useState('all')
  const filtered = (scenes ?? []).filter((s) => cat === 'all' || s.category === cat)
  const selected = scenes?.find((s) => s.id === sceneId)

  return (
    <PageShell title="Create Scene" subtitle="Pick a scene template and animate your photo" backHref="/video">
      <SourcePhotoUpload file={source.file} preview={source.preview} onChange={(f, p) => setSource({ file: f, preview: p })} />

      <div className="mt-8 space-y-4">
        <p className="text-sm font-medium text-[#e8e4dc]">Scene</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                'px-3 py-1 rounded-full text-xs capitalize border flex-shrink-0',
                cat === c ? 'border-[#c9a96e]/40 bg-[#c9a96e]/10 text-[#e8d5b5]' : 'border-white/[0.08] text-[#8b8fa8]'
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((s: SceneItem) => (
            <button
              key={s.id}
              onClick={() => setSceneId(s.id)}
              className={cn(
                'rounded-xl border p-3 text-left text-sm transition-all',
                sceneId === s.id ? 'border-[#c9a96e]/50 bg-[#c9a96e]/10' : 'border-white/[0.08] bg-white/[0.02]'
              )}
            >
              <p className="font-medium text-white">{s.label}</p>
              <p className="text-[10px] text-[#8b8fa8] mt-1 capitalize">{s.category} · {s.credits} cr</p>
            </button>
          ))}
        </div>
      </div>

      {moods && moods.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-[#e8e4dc]">Mood (optional)</p>
          <OptionGrid options={moods} value={moodId} onChange={setMoodId} columns={3} />
        </div>
      )}

      <p className="text-xs text-[#8b8fa8] mt-6">{selected?.credits ?? CREDIT_COSTS.video} credits</p>
      <Button
        className="w-full mt-4"
        size="lg"
        disabled={!source.file || !sceneId}
        loading={isPending}
        leftIcon={<Sparkles className="h-4 w-4" />}
        onClick={() => {
          if (!source.file || !sceneId) return
          createJob(
            {
              job_type: 'i2v',
              scene_id: sceneId,
              mood_modifier: moodId ?? undefined,
              source_image: source.file,
            },
            { onSuccess: (job) => setJobId(job.id) }
          )
        }}
      >
        Generate video
      </Button>
      <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
    </PageShell>
  )
}

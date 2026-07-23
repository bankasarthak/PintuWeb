'use client'

import { useState, useMemo } from 'react'
import { Camera, Film, Wand2, Sparkles } from 'lucide-react'
import { useScenes, useMoods, useCreateJob } from '@/hooks/useGenerate'
import { SceneCard } from '@/components/generate/SceneCard'
import { MoodSelector } from '@/components/generate/MoodSelector'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Character } from '@/types'

type Mode = 'companion' | 'random'
type SubMode = 'photo' | 'video' | 'custom'

const categories = ['all', 'intimate', 'bondage', 'aftermath', 'lingerie', 'outdoor', 'fantasy']

export function CreateTab({ character }: { character: Character }) {
  const [mode, setMode] = useState<Mode>('companion')
  const [subMode, setSubMode] = useState<SubMode>('photo')
  const [outputFormat, setOutputFormat] = useState<'photo' | 'video'>('photo')
  const [selectedScene, setSelectedScene] = useState<string | null>(null)
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [jobId, setJobId] = useState<string | null>(null)

  const { data: scenes, isLoading: scenesLoading } = useScenes()
  const { data: moods, isLoading: moodsLoading } = useMoods()
  const { mutate: createJob, isPending: creating } = useCreateJob()

  const filteredScenes = useMemo(() => {
    if (!scenes) return []
    if (categoryFilter === 'all') return scenes
    return scenes.filter((s) => s.category.toLowerCase() === categoryFilter)
  }, [scenes, categoryFilter])

  const toggleMood = (id: string) => {
    setSelectedMoods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleGenerate = () => {
    const jobType = (subMode === 'custom' ? outputFormat : subMode) === 'video' ? 'i2v' : 'i2i'
    createJob(
      {
        character_id: character.id,
        job_type: subMode === 'video' ? 'i2v' : 'i2i',
        scene_id: selectedScene ?? undefined,
        mood_modifier: selectedMoods[0] ?? undefined,
        custom_prompt: customPrompt || undefined,
      },
      {
        onSuccess: (job) => {
          setJobId(job.id)
        },
      }
    )
  }

  const canGenerate =
    subMode === 'custom' ? customPrompt.trim().length > 0 : Boolean(selectedScene)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#13131a] border border-[#1e1e2e] w-fit mb-6">
        {([
          { value: 'companion', label: 'My Companion' },
          { value: 'random', label: 'Random AI' },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mode === value
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
            aria-pressed={mode === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-Mode Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {([
          { value: 'photo', label: 'Photo', icon: Camera },
          { value: 'video', label: 'Video', icon: Film },
          { value: 'custom', label: 'Custom', icon: Wand2 },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSubMode(value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              subMode === value
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'border-[#1e1e2e] text-[#94a3b8] hover:border-[#2e2e4e] hover:text-white'
            )}
            aria-pressed={subMode === value}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {subMode === 'custom' ? (
        <div className="flex flex-col gap-4">
          <Textarea
            label="Custom prompt"
            placeholder="Describe exactly what you want to see... Be as detailed as you like."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[140px]"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setOutputFormat('photo')}
              variant="outline"
              size="sm"
              leftIcon={<Camera className="h-3.5 w-3.5" />}
              aria-pressed={outputFormat === 'photo'}
            >
              Photo
            </Button>
            <Button
              onClick={() => setOutputFormat('video')}
              variant="outline"
              size="sm"
              leftIcon={<Film className="h-3.5 w-3.5" />}
              aria-pressed={outputFormat === 'video'}
            >
              Video
            </Button>
          </div>
          {!moodsLoading && moods && (
            <div>
              <p className="text-sm font-medium text-[#94a3b8] mb-2">Mood modifiers</p>
              <MoodSelector moods={moods} selected={selectedMoods} onToggle={toggleMood} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium capitalize flex-shrink-0 transition-all border',
                  categoryFilter === cat
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'border-[#1e1e2e] text-[#94a3b8] hover:border-purple-500/40 hover:text-white'
                )}
                aria-pressed={categoryFilter === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scene Grid */}
          {scenesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8] text-sm">
              No scenes in this category yet
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {filteredScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  selected={selectedScene === scene.id}
                  onSelect={() =>
                    setSelectedScene((prev) => (prev === scene.id ? null : scene.id))
                  }
                />
              ))}
            </div>
          )}

          {/* Mood Modifiers */}
          {selectedScene && !moodsLoading && moods && (
            <div className="mb-6">
              <p className="text-sm font-medium text-[#94a3b8] mb-2">Mood modifiers (optional)</p>
              <MoodSelector moods={moods} selected={selectedMoods} onToggle={toggleMood} />
            </div>
          )}

          {/* Custom text overlay */}
          {selectedScene && (
            <div className="mb-6">
              <Textarea
                label="Additional prompt (optional)"
                placeholder="Add extra details like clothing, lighting, pose..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </>
      )}

      {/* Generate Button */}
      <Button
        size="lg"
        className="w-full"
        loading={creating}
        disabled={!canGenerate}
        onClick={handleGenerate}
        leftIcon={<Sparkles className="h-4 w-4" />}
        aria-label={`Generate ${subMode === 'video' ? 'video' : 'photo'}`}
      >
        Generate {subMode === 'video' ? 'Video' : 'Photo'}
      </Button>

      <p className="text-xs text-[#94a3b8] text-center mt-2">
        Credits are only charged on successful generation
      </p>

      {/* Progress Modal */}
      <JobProgress
        jobId={jobId}
        onClose={() => setJobId(null)}
      />
    </div>
  )
}

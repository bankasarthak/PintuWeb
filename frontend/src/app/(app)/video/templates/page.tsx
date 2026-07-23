'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { TemplateCard } from '@/components/generate/TemplateCard'
import { JobProgress } from '@/components/generate/JobProgress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTemplates, useCreateJob } from '@/hooks/useGenerate'
import {
  TEMPLATE_INNER_TAGS,
  TEMPLATE_OUTER_TABS,
  TEMPLATE_PAGE_SIZE,
  type TemplateOuterFilter,
} from '@/lib/templateFilters'
import { cn } from '@/lib/utils'
import type { TemplateItem } from '@/types'

function buildTopRatedRank(ids: string[]) {
  const rank: Record<string, number> = {}
  ids.forEach((id, idx) => {
    rank[id] = idx
  })
  return rank
}

function filterTemplates(
  templates: TemplateItem[],
  outer: TemplateOuterFilter,
  innerTags: Set<string>,
  search: string,
  topRatedRank: Record<string, number>
) {
  const q = search.toLowerCase().trim()
  const hasInner = innerTags.size > 0

  let list = templates.filter((t) => {
    if (t.id === 'i2v_custom') return false
    if (outer === 'top_rated') {
      if (!t.tags?.includes('top_rated')) return false
    } else if (outer !== 'all') {
      if (!t.tags?.includes(outer)) return false
    }
    if (hasInner) {
      const tags = t.tags || []
      let matched = false
      innerTags.forEach((tag) => {
        if (tags.includes(tag)) matched = true
      })
      if (!matched) return false
    }
    if (q) {
      const haystack = `${t.label} ${t.description} ${(t.tags || []).join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  if (outer === 'top_rated') {
    list = list.slice().sort((a, b) => {
      const ai = topRatedRank[a.id] ?? 9999
      const bi = topRatedRank[b.id] ?? 9999
      return ai !== bi ? ai - bi : a.label.localeCompare(b.label)
    })
  }

  return list
}

export default function VideoTemplatesPage() {
  const { data, isLoading, isError, error } = useTemplates()
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({
    file: null,
    preview: null,
  })
  const [search, setSearch] = useState('')
  const [outer, setOuter] = useState<TemplateOuterFilter>('top_rated')
  const [innerTags, setInnerTags] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate: createJob, isPending } = useCreateJob()

  const templates = data?.templates ?? []
  const topRatedRank = useMemo(
    () => buildTopRatedRank(data?.top_rated_ids ?? []),
    [data?.top_rated_ids]
  )

  const filtered = useMemo(
    () => filterTemplates(templates, outer, innerTags, search, topRatedRank),
    [templates, outer, innerTags, search, topRatedRank]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / TEMPLATE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice(
    (currentPage - 1) * TEMPLATE_PAGE_SIZE,
    currentPage * TEMPLATE_PAGE_SIZE
  )

  const filtersActive =
    innerTags.size > 0 || (outer !== 'all' && outer !== 'top_rated') || search.trim().length > 0

  const toggleTag = (tag: string) => {
    setInnerTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setOuter('top_rated')
    setInnerTags(new Set())
    setSearch('')
    setPage(1)
  }

  return (
    <PageShell title="Templates" subtitle="Proven presets — one tap to animate" backHref="/video">
      <SourcePhotoUpload
        file={source.file}
        preview={source.preview}
        onChange={(f, p) => setSource({ file: f, preview: p })}
      />

      <div className="mt-6 space-y-4">
        <Input
          placeholder="Search templates…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          leftIcon={<Search className="h-4 w-4" />}
        />

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TEMPLATE_OUTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setOuter(tab.id)
                setPage(1)
              }}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                outer === tab.id
                  ? 'bg-[#c9a96e]/20 text-[#e8d5b5] border border-[#c9a96e]/40'
                  : 'bg-white/[0.04] text-[#8b8fa8] border border-white/[0.08] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TEMPLATE_INNER_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                innerTags.has(tag.id)
                  ? 'bg-[#c9a96e]/15 text-[#e8d5b5] border border-[#c9a96e]/35'
                  : 'bg-transparent text-[#8b8fa8] border border-white/[0.08] hover:border-white/[0.15] hover:text-white'
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {filtersActive ? (
          <div className="flex items-center justify-between text-xs text-[#8b8fa8]">
            <span>
              {filtered.length} template{filtered.length === 1 ? '' : 's'} found
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[#c9a96e] hover:text-[#e8d5b5]"
            >
              Clear filters
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-8 text-center text-sm text-[#8b8fa8]">Loading templates…</p>
      ) : isError ? (
        <p className="mt-8 text-center text-sm text-red-400">
          Failed to load templates. {error instanceof Error ? error.message : ''}
        </p>
      ) : pageItems.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[#8b8fa8]">No templates match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {pageItems.map((t, idx) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={(currentPage - 1) * TEMPLATE_PAGE_SIZE + idx}
              selected={selected === t.id}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span className="text-xs text-[#8b8fa8]">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </div>
      ) : null}

      <Button
        className="w-full mt-8"
        size="lg"
        disabled={!source.file || !selected}
        loading={isPending}
        leftIcon={<Sparkles className="h-4 w-4" />}
        onClick={() => {
          if (!source.file || !selected) return
          createJob(
            {
              job_type: 'i2v',
              template_id: selected,
              source_image: source.file,
            },
            { onSuccess: (j) => setJobId(j.id) }
          )
        }}
      >
        Generate video · 5 credits
      </Button>
      <JobProgress jobId={jobId} onClose={() => setJobId(null)} />
    </PageShell>
  )
}

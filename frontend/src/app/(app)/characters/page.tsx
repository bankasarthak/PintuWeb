'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, CheckCircle2, MessageCircle, Sparkles, Calendar } from 'lucide-react'
import { useCharacters, useCreateCharacter } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CreateCompanionForm } from '@/components/companion/CreateCompanionForm'
import { CardSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Character } from '@/types'

// ── Character card ─────────────────────────────────────────────────────────

function CharacterCard({
  character,
  isActive,
  onSetActive,
}: {
  character: Character
  isActive: boolean
  onSetActive: (id: string) => void
}) {
  const faceUrl = character.has_face_image ? characterApi.getFace(character.id) : null

  return (
    <div
      className={cn(
        'relative rounded-2xl border overflow-hidden transition-all duration-200 group',
        isActive
          ? 'border-purple-500/60 ring-1 ring-purple-500/30 bg-gradient-to-br from-purple-900/20 to-[#13131a]'
          : 'border-[#1e1e2e] bg-[#13131a] hover:border-[#2e2e4e]'
      )}
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-purple-600/30 backdrop-blur-sm border border-purple-500/40 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3 text-purple-400" />
          <span className="text-[10px] font-bold text-purple-300">Active</span>
        </div>
      )}

      {/* Face */}
      <div className="aspect-square w-full overflow-hidden bg-[#1e1e2e] relative">
        {faceUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faceUrl} alt={character.name || 'Character'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Avatar name={character.name || 'C'} size="xl" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-white truncate mb-0.5">
          {character.name || 'Unnamed'}
        </p>
        <p className="text-xs text-[#94a3b8] capitalize flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {character.age}y · {character.personality_type}
        </p>

        <div className="flex gap-2 mt-3">
          {!isActive && (
            <button
              onClick={() => onSetActive(character.id)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-purple-600/30 text-purple-400 hover:bg-purple-600/10 transition-colors font-medium"
            >
              Set Active
            </button>
          )}
          <Link href={`/companions/${character.id}?tab=chat`} className={cn(!isActive ? 'flex-1' : 'flex-1')}>
            <button className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-purple-600/20 border border-purple-600/30 text-white hover:bg-purple-600/35 transition-colors font-medium">
              <MessageCircle className="h-3.5 w-3.5" />
              {isActive ? 'Chat' : 'Chat'}
            </button>
          </Link>
          <Link href={`/companions/${character.id}?tab=create`}>
            <button className="flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded-lg bg-[#1e1e2e] hover:bg-[#2e2e4e] text-[#94a3b8] hover:text-white transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Add card ───────────────────────────────────────────────────────────────

function AddCharacterCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-[#2e2e4e] hover:border-purple-600/40 bg-transparent hover:bg-purple-600/5 transition-all flex flex-col items-center justify-center gap-3 p-6 aspect-square cursor-pointer group"
    >
      <div className="h-12 w-12 rounded-xl border-2 border-dashed border-[#2e2e4e] group-hover:border-purple-600/40 flex items-center justify-center transition-colors">
        <Plus className="h-6 w-6 text-[#4a4a6a] group-hover:text-purple-400 transition-colors" />
      </div>
      <span className="text-xs font-semibold text-[#4a4a6a] group-hover:text-purple-400 transition-colors text-center">
        Create Character
      </span>
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CharactersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const activeId = useUIStore((s) => s.activeCompanionId)
  const setActive = useUIStore((s) => s.setActiveCompanionId)

  const { data: characters, isLoading } = useCharacters()
  const { mutate: createCharacter, isPending: creating } = useCreateCharacter({
    onSuccess: () => setCreateOpen(false),
  })

  const activeChar = characters?.find((c) => c.id === activeId) ?? characters?.[0]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1e1e2e] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Characters</h1>
          {!isLoading && (
            <p className="text-xs text-[#94a3b8]">
              {(characters?.length ?? 0) === 0
                ? 'No characters yet'
                : `${characters!.length} character${characters!.length !== 1 ? 's' : ''} · tap to set active`}
            </p>
          )}
        </div>
        {(characters?.length ?? 0) < 3 && (
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
            New
          </Button>
        )}
      </div>

      {/* Active character highlight */}
      {!isLoading && activeChar && (
        <div className="mx-4 mt-4 rounded-2xl border border-purple-600/25 bg-gradient-to-br from-purple-900/15 to-[#13131a] p-4 flex items-center gap-4">
          <Avatar
            src={activeChar.has_face_image ? characterApi.getFace(activeChar.id) : null}
            name={activeChar.name || 'Her'}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#94a3b8] mb-0.5">Active Character</p>
            <p className="font-semibold text-white truncate">{activeChar.name || 'Unnamed'}</p>
            <p className="text-xs text-[#94a3b8] capitalize mt-0.5">{activeChar.age}y · {activeChar.personality_type}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/companions/${activeChar.id}?tab=chat`}>
              <Button size="sm" variant="secondary" aria-label="Chat">
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={`/companions/${activeChar.id}?tab=create`}>
              <Button size="sm" aria-label="Create">
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Character grid */}
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {characters?.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                isActive={c.id === (activeChar?.id)}
                onSetActive={(id) => setActive(id)}
              />
            ))}
            {(characters?.length ?? 0) < 3 && (
              <AddCharacterCard onClick={() => setCreateOpen(true)} />
            )}
          </div>
        )}

        {!isLoading && (characters?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-2xl bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center mb-5">
              <Plus className="h-10 w-10 text-[#94a3b8]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No characters yet</h3>
            <p className="text-sm text-[#94a3b8] max-w-xs mb-6 leading-relaxed">
              Create a character with a face photo — she unlocks Create Scene, Story Mode, Custom Prompt, and Chat.
            </p>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Create your first character
            </Button>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Character"
        description="Upload a face photo and set her traits"
        size="lg"
      >
        <CreateCompanionForm
          onSuccess={() => setCreateOpen(false)}
          onCreate={(payload, faceImage) => createCharacter({ payload, faceImage })}
          loading={creating}
        />
      </Modal>
    </div>
  )
}

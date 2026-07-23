'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, CheckCircle2, MessageCircle, Sparkles, Calendar } from 'lucide-react'
import { useCharacters, useCreateCharacter } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { AuthenticatedAvatar } from '@/components/shared/AuthenticatedAvatar'
import { CharacterFace } from '@/components/shared/CharacterFace'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CreateCompanionForm } from '@/components/companion/CreateCompanionForm'
import { CardSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Character } from '@/types'

function CharacterCard({
  character,
  isActive,
  onSetActive,
}: {
  character: Character
  isActive: boolean
  onSetActive: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border overflow-hidden transition-all duration-200 group',
        isActive
          ? 'border-[#c9a96e]/50 ring-1 ring-[#c9a96e]/25 bg-gradient-to-br from-[#c9a96e]/10 to-white/[0.02]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-[#c9a96e]/25'
      )}
    >
      {isActive && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#c9a96e]/20 backdrop-blur-sm border border-[#c9a96e]/35 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3 text-[#c9a96e]" />
          <span className="text-[10px] font-bold text-[#e8d5b5]">Active</span>
        </div>
      )}

      <div className="aspect-square w-full overflow-hidden bg-[#0f0f14] relative">
        <CharacterFace
          characterId={character.id}
          name={character.name}
          hasFaceImage={character.has_face_image}
        />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-0.5">
          <AuthenticatedAvatar
            characterId={character.id}
            name={character.name}
            hasFaceImage={character.has_face_image}
            size="xs"
          />
          <p className="font-semibold text-sm text-white truncate flex-1">
            {character.name || 'Unnamed'}
          </p>
        </div>
        <p className="text-xs text-[#8b8fa8] capitalize flex items-center gap-1 ml-8">
          <Calendar className="h-3 w-3" />
          {character.age}y · {character.personality_type}
        </p>

        <div className="flex gap-2 mt-3">
          {!isActive && (
            <button
              onClick={() => onSetActive(character.id)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 transition-colors font-medium"
            >
              Set Active
            </button>
          )}
          <Link href={`/companions/${character.id}?tab=chat`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-[#c9a96e]/15 border border-[#c9a96e]/30 text-white hover:bg-[#c9a96e]/25 transition-colors font-medium">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </button>
          </Link>
          <Link href={`/companions/${character.id}?tab=create`}>
            <button className="flex items-center justify-center gap-1 text-xs py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8b8fa8] hover:text-white transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function AddCharacterCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-[#c9a96e]/35 bg-transparent hover:bg-[#c9a96e]/5 transition-all flex flex-col items-center justify-center gap-3 p-6 aspect-square cursor-pointer group"
    >
      <div className="h-12 w-12 rounded-xl border-2 border-dashed border-white/[0.1] group-hover:border-[#c9a96e]/35 flex items-center justify-center transition-colors">
        <Plus className="h-6 w-6 text-[#8b8fa8] group-hover:text-[#c9a96e] transition-colors" />
      </div>
      <span className="text-xs font-semibold text-[#8b8fa8] group-hover:text-[#c9a96e] transition-colors text-center">
        Create Character
      </span>
    </button>
  )
}

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
    <div className="min-h-screen bg-[#07070b]">
      <div className="sticky top-0 z-30 bg-[#07070b]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white font-display">Characters</h1>
          {!isLoading && (
            <p className="text-xs text-[#8b8fa8]">
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

      {!isLoading && activeChar && (
        <div className="mx-4 mt-4 rounded-2xl border border-[#c9a96e]/25 bg-gradient-to-br from-[#c9a96e]/8 to-white/[0.02] p-4 flex items-center gap-4">
          <AuthenticatedAvatar
            characterId={activeChar.id}
            name={activeChar.name}
            hasFaceImage={activeChar.has_face_image}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#8b8fa8] mb-0.5">Active Character</p>
            <p className="font-semibold text-white truncate">{activeChar.name || 'Unnamed'}</p>
            <p className="text-xs text-[#8b8fa8] capitalize mt-0.5">{activeChar.age}y · {activeChar.personality_type}</p>
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
                isActive={c.id === activeChar?.id}
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
            <div className="h-20 w-20 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-5">
              <Plus className="h-10 w-10 text-[#8b8fa8]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No characters yet</h3>
            <p className="text-sm text-[#8b8fa8] max-w-xs mb-6 leading-relaxed">
              Create a character with a face photo for personalized chat and companion experiences.
            </p>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Create your first character
            </Button>
          </div>
        )}
      </div>

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

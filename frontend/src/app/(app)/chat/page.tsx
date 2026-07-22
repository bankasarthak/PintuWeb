'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronDown } from 'lucide-react'
import { useCharacters, useCreateCharacter } from '@/hooks/useCharacters'
import { useCharacter } from '@/hooks/useCharacters'
import { useUIStore } from '@/stores/ui'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { CreateCompanionForm } from '@/components/companion/CreateCompanionForm'
import { ChatTab } from '@/components/companion/ChatTab'
import { cn } from '@/lib/utils'

// ── Character switcher dropdown ────────────────────────────────────────────

function CharacterSwitcher({
  characters,
  activeId,
  onSwitch,
}: {
  characters: NonNullable<ReturnType<typeof useCharacters>['data']>
  activeId: string
  onSwitch: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = characters.find((c) => c.id === activeId) ?? characters[0]
  const faceUrl = active.has_face_image ? characterApi.getFace(active.id) : null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2e2e4e] bg-[#13131a] hover:border-purple-500/40 transition-colors"
      >
        <Avatar src={faceUrl} name={active.name || 'Her'} size="xs" />
        <span className="text-sm font-medium text-white">{active.name || 'Her'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-[#94a3b8] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-[#1a1a2e] border border-[#2e2e4e] rounded-xl shadow-xl z-50 p-1.5">
          {characters.map((c) => {
            const cf = c.has_face_image ? characterApi.getFace(c.id) : null
            return (
              <button
                key={c.id}
                onClick={() => { onSwitch(c.id); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-left',
                  c.id === activeId ? 'bg-purple-600/20' : 'hover:bg-[#2e2e4e]'
                )}
              >
                <Avatar src={cf} name={c.name || 'Her'} size="xs" />
                <span className="text-sm text-white">{c.name || 'Unnamed'}</span>
                {c.id === activeId && <span className="ml-auto text-[10px] text-purple-400 font-bold">●</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* click-outside close */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}

// ── Chat area with character loaded ───────────────────────────────────────

function ChatWithCharacter({ characterId }: { characterId: string }) {
  const { data: character, isLoading } = useCharacter(characterId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }
  if (!character) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#94a3b8] text-sm">Character not found.</p>
      </div>
    )
  }
  return (
    <div className="flex-1 overflow-hidden">
      <ChatTab character={character} />
    </div>
  )
}

// ── No character empty state ───────────────────────────────────────────────

function NoCharacterState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-5">💬</div>
        <h2 className="text-xl font-bold text-white mb-3">Chat needs a Character</h2>
        <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
          Create a character with a face photo and she'll respond as your personal AI companion.
          Generate images and videos right in the conversation.
        </p>
        <Button
          onClick={onCreate}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full"
          size="lg"
        >
          Create a Character
        </Button>
        <p className="text-xs text-[#4a4a6a] mt-3">Takes about 30 seconds</p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: characters, isLoading: charsLoading } = useCharacters()
  const activeId = useUIStore((s) => s.activeCompanionId)
  const setActive = useUIStore((s) => s.setActiveCompanionId)
  const [createOpen, setCreateOpen] = useState(false)
  const { mutate: createCharacter, isPending: creating } = useCreateCharacter({
    onSuccess: () => setCreateOpen(false),
  })

  const hasCharacter = (characters?.length ?? 0) > 0
  const activeCharId = characters?.find((c) => c.id === activeId)?.id ?? characters?.[0]?.id ?? null

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex-shrink-0 sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1e1e2e] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Chat</h1>
        {hasCharacter && characters && activeCharId && (
          <CharacterSwitcher
            characters={characters}
            activeId={activeCharId}
            onSwitch={(id) => setActive(id)}
          />
        )}
      </div>

      {/* Content */}
      {charsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : !hasCharacter ? (
        <NoCharacterState onCreate={() => setCreateOpen(true)} />
      ) : activeCharId ? (
        <ChatWithCharacter key={activeCharId} characterId={activeCharId} />
      ) : null}

      {/* Create character modal */}
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

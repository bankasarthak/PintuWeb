'use client'

import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useCharacters, useCreateCharacter } from '@/hooks/useCharacters'
import { CompanionCard } from '@/components/companion/CompanionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { CardSkeleton } from '@/components/ui/skeleton'
import { CreateCompanionForm } from '@/components/companion/CreateCompanionForm'

export default function CompanionsPage() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: characters, isLoading } = useCharacters()
  const { mutate: createCharacter, isPending: creating } = useCreateCharacter({
    onSuccess: () => setCreateOpen(false),
  })

  const filtered = characters?.filter((c) =>
    (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    c.personality_type.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Companions</h1>
          <p className="text-[#94a3b8] mt-1">
            {characters?.length ?? 0} companion{(characters?.length ?? 0) !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
          aria-label="Create new companion"
        >
          New Companion
        </Button>
      </div>

      {/* Search */}
      {(characters?.length ?? 0) > 3 && (
        <div className="mb-6 max-w-sm">
          <Input
            placeholder="Search companions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search companions"
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-2xl bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center mb-5">
            <Users className="h-10 w-10 text-[#94a3b8]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? 'No companions found' : 'No companions yet'}
          </h3>
          <p className="text-sm text-[#94a3b8] max-w-sm mb-6">
            {search
              ? 'Try a different search term'
              : 'Create your first AI companion and start your journey'}
          </p>
          {!search && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
            >
              Create your first companion
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((character) => (
            <CompanionCard key={character.id} character={character} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Companion"
        description="Design your perfect AI companion"
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

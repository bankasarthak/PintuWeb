'use client'

import Link from 'next/link'
import { MessageSquare, Sparkles, Calendar, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { characterApi } from '@/lib/api'
import type { Character } from '@/types'

interface CompanionCardProps {
  character: Character
  onChat?: () => void
  onGenerate?: () => void
  className?: string
}

const personalityColors: Record<string, string> = {
  dominant: 'purple',
  submissive: 'blue',
  caring: 'green',
  playful: 'yellow',
  mysterious: 'default',
  romantic: 'red',
  intellectual: 'blue',
}

export function CompanionCard({ character, onChat, onGenerate, className }: CompanionCardProps) {
  const faceUrl = character.has_face_image ? characterApi.getFace(character.id) : null
  const personalityVariant = (personalityColors[character.personality_type] ?? 'purple') as Parameters<typeof Badge>[0]['variant']

  return (
    <div
      className={cn(
        'group rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-5 flex flex-col gap-4',
        'transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-900/10',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar
          src={faceUrl}
          name={character.name || 'Companion'}
          size="lg"
          alt={`${character.name || 'Companion'} avatar`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base truncate">
            {character.name || 'Unnamed Companion'}
          </h3>
          <Badge variant={personalityVariant} className="mt-1 capitalize">
            <Heart className="h-2.5 w-2.5 mr-1" />
            {character.personality_type}
          </Badge>
        </div>
      </div>

      {/* Traits */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="default" className="text-[10px]">
          <Calendar className="h-2.5 w-2.5 mr-1" />
          {character.age}y
        </Badge>
        <Badge variant="default" className="text-[10px] capitalize">
          {character.body_type}
        </Badge>
        <Badge variant="default" className="text-[10px] capitalize">
          {character.skin_tone} skin
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {onChat ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onChat}
            leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
            aria-label={`Chat with ${character.name || 'companion'}`}
          >
            Chat
          </Button>
        ) : (
          <Link href={`/companions/${character.id}?tab=chat`} className="flex-1">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
              aria-label={`Chat with ${character.name || 'companion'}`}
            >
              Chat
            </Button>
          </Link>
        )}
        {onGenerate ? (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onGenerate}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            aria-label={`Generate content for ${character.name || 'companion'}`}
          >
            Create
          </Button>
        ) : (
          <Link href={`/companions/${character.id}?tab=create`} className="flex-1">
            <Button
              variant="default"
              size="sm"
              className="w-full"
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              aria-label={`Generate content for ${character.name || 'companion'}`}
            >
              Create
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

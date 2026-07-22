'use client'

import { useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useCharacter } from '@/hooks/useCharacters'
import { characterApi } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatTab } from '@/components/companion/ChatTab'
import { CreateTab } from '@/components/companion/CreateTab'
import { GalleryTab } from '@/components/companion/GalleryTab'
import { SettingsTab } from '@/components/companion/SettingsTab'
import { MessageSquare, Sparkles, ImageIcon, Settings, Calendar } from 'lucide-react'

const tabItems = [
  { value: 'chat', label: 'Chat', icon: MessageSquare },
  { value: 'create', label: 'Create', icon: Sparkles },
  { value: 'gallery', label: 'Gallery', icon: ImageIcon },
  { value: 'settings', label: 'Settings', icon: Settings },
]

function CompanionHubContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'chat'
  const [activeTab, setActiveTab] = useState(initialTab)

  const { data: character, isLoading } = useCharacter(params.id)

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-start gap-4 mb-8">
          <Skeleton variant="circle" className="h-20 w-20" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!character) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#94a3b8]">Companion not found.</p>
      </div>
    )
  }

  const faceUrl = character.has_face_image ? characterApi.getFace(character.id) : null

  return (
    <div className="h-screen flex flex-col">
      {/* Top Panel */}
      <div className="flex-shrink-0 border-b border-[#1e1e2e] bg-[#0d0d14] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <Avatar src={faceUrl} name={character.name || 'Companion'} size="lg" alt={`${character.name} avatar`} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {character.name || 'Unnamed Companion'}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="purple" className="capitalize">{character.personality_type}</Badge>
              <Badge variant="default">
                <Calendar className="h-2.5 w-2.5 mr-1" />
                {character.age}y
              </Badge>
              <Badge variant="default" className="capitalize">{character.body_type}</Badge>
              <Badge variant="default" className="capitalize">{character.skin_tone} skin</Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto">
              {tabItems.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}>
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="chat" className="h-full">
            <ChatTab character={character} />
          </TabsContent>
          <TabsContent value="create" className="h-full overflow-y-auto">
            <CreateTab character={character} />
          </TabsContent>
          <TabsContent value="gallery" className="h-full overflow-y-auto">
            <GalleryTab characterId={character.id} />
          </TabsContent>
          <TabsContent value="settings" className="h-full overflow-y-auto">
            <SettingsTab character={character} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function CompanionHubPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#1e1e2e] border-t-purple-500" />
      </div>
    }>
      <CompanionHubContent />
    </Suspense>
  )
}

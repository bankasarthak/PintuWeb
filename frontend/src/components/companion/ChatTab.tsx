'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Plus, Trash2, MessageSquare, Edit2, Check, X, ArrowDown } from 'lucide-react'
import {
  useChatSessions,
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
  useChatMessages,
  useSendMessage,
} from '@/hooks/useChat'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmModal } from '@/components/ui/modal'
import { AuthenticatedAvatar } from '@/components/shared/AuthenticatedAvatar'
import { useAuthStore } from '@/stores/auth'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Character, ChatMessage, ChatSession } from '@/types'

function TypingIndicator({ character }: { character: Character }) {
  return (
    <div className="flex items-end gap-2 max-w-[70%]">
      <AuthenticatedAvatar characterId={character.id} name={character.name} hasFaceImage={character.has_face_image} size="xs" />
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-[#94a3b8] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  character,
  userName,
}: {
  message: ChatMessage
  character: Character
  userName?: string | null
}) {
  const isUser = message.role === 'user'
  const isNudge = message.is_nudge

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        'max-w-[75%]',
        isUser ? 'ml-auto' : 'mr-auto'
      )}
    >
      {!isUser ? (
        <AuthenticatedAvatar
          characterId={character.id}
          name={character.name || 'Companion'}
          hasFaceImage={character.has_face_image}
          size="xs"
        />
      ) : (
        <Avatar name={userName || 'You'} size="xs" />
      )}
      <div
        className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-[#c9a96e] to-[#e8d5b5] text-[#07070b] rounded-br-sm'
            : isNudge
            ? 'bg-white/[0.02] border border-[#c9a96e]/40 text-white rounded-bl-sm'
            : 'bg-white/[0.02] border border-white/[0.08] text-white rounded-bl-sm'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {isNudge && (
          <button className="mt-2 flex items-center gap-1.5 text-xs text-[#c9a96e] hover:text-[#e8d5b5] transition-colors font-medium">
            See my photo →
          </button>
        )}
        <p className={cn('text-[10px] mt-1', isUser ? 'text-[#07070b]/60' : 'text-[#8b8fa8]')}>
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title)

  const handleRename = () => {
    onRename(title)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all group',
        isActive ? 'bg-[#c9a96e]/10 border border-[#c9a96e]/25' : 'hover:bg-white/[0.04]'
      )}
      onClick={!editing ? onSelect : undefined}
      role="button"
      tabIndex={0}
      aria-label={`Chat session: ${session.title}`}
      onKeyDown={(e) => e.key === 'Enter' && !editing && onSelect()}
    >
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white border-b border-[#c9a96e] focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
            autoFocus
          />
          <button onClick={handleRename} className="text-green-400" aria-label="Save title"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={() => setEditing(false)} className="text-red-400" aria-label="Cancel rename"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <>
          <MessageSquare className="h-3.5 w-3.5 text-[#8b8fa8] flex-shrink-0" />
          <span className="flex-1 text-sm text-white truncate">{session.title}</span>
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true) }}
              className="text-[#8b8fa8] hover:text-white transition-colors"
              aria-label="Rename session"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-[#8b8fa8] hover:text-red-400 transition-colors"
              aria-label="Delete session"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ChatTab({ character }: { character: Character }) {
  const userName = useAuthStore((s) => s.user?.display_name || s.user?.email)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: sessions, isLoading: sessionsLoading } = useChatSessions(character.id)
  const { mutate: createSession, isPending: creatingSession } = useCreateSession()
  const { mutate: deleteSession, isPending: deletingSession } = useDeleteSession()
  const { mutate: updateSession } = useUpdateSession()
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(activeSessionId)
  const { mutate: sendMessage, isPending: sending } = useSendMessage(activeSessionId, character.id)

  // Set first session as active on load
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions, activeSessionId])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.pages])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollBtn(distFromBottom > 200)

    // Load more on scroll to top
    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = () => {
    if (!input.trim() || !activeSessionId) return
    sendMessage(input.trim())
    setInput('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const allMessages = useMemo(() => {
    const flat = messagesData?.pages.flatMap((page) => page.items) ?? []
    // Deduplicate by id (guards against any cache overlap) and sort chronologically
    const seen = new Set<string>()
    return flat
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [messagesData?.pages])

  const activeSession = sessions?.find((s) => s.id === activeSessionId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Session Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-white/[0.08] flex flex-col bg-[#07070b] hidden sm:flex">
        <div className="p-3 border-b border-white/[0.08]">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            loading={creatingSession}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() =>
              createSession(
                { characterId: character.id },
                { onSuccess: (s) => setActiveSessionId(s.id) }
              )
            }
            aria-label="Start new chat session"
          >
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessionsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : sessions?.length === 0 ? (
            <p className="text-xs text-[#8b8fa8] text-center py-4">No chats yet</p>
          ) : (
            sessions?.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => setActiveSessionId(session.id)}
                onDelete={() => setDeleteSessionId(session.id)}
                onRename={(title) => updateSession({ id: session.id, title })}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        {activeSession && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.08] bg-[#07070b] flex items-center gap-3">
            <AuthenticatedAvatar characterId={character.id} name={character.name} hasFaceImage={character.has_face_image} size="sm" />
            <div>
              <p className="text-sm font-medium text-white">{character.name || 'Companion'}</p>
              <p className="text-xs text-[#8b8fa8]">{activeSession.title}</p>
            </div>
          </div>
        )}

        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <AuthenticatedAvatar characterId={character.id} name={character.name} hasFaceImage={character.has_face_image} size="xl" className="mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">
                Start chatting with {character.name || 'your companion'}
              </h3>
              <p className="text-sm text-[#8b8fa8] mb-4">Select a chat or start a new one</p>
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                loading={creatingSession}
                onClick={() =>
                  createSession(
                    { characterId: character.id },
                    { onSuccess: (s) => setActiveSessionId(s.id) }
                  )
                }
              >
                New Chat
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
              onScroll={handleScroll}
            >
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <Spinner size="sm" />
                </div>
              )}

              {messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : allMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <p className="text-sm text-[#8b8fa8] mb-1">
                      Say hi to {character.name || 'your companion'}!
                    </p>
                    <p className="text-xs text-[#4a4a6a]">They&apos;re waiting for you...</p>
                  </div>
                </div>
              ) : (
                allMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    character={character}
                    userName={userName}
                  />
                ))
              )}

              {sending && <TypingIndicator character={character} />}

              <div ref={messagesEndRef} />
            </div>

            {showScrollBtn && (
              <button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-24 right-6 h-8 w-8 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-[#8b8fa8] hover:text-white transition-colors shadow-lg"
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}

            {/* Input */}
            <div className="flex-shrink-0 border-t border-white/[0.08] p-4 bg-[#07070b]">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${character.name || 'companion'}...`}
                  rows={1}
                  className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#4a4a6a] focus:border-[#c9a96e]/50 focus:ring-2 focus:ring-[#c9a96e]/20 focus:outline-none resize-none max-h-32 transition-all"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                  }}
                  aria-label="Type a message"
                  disabled={sending}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  loading={sending}
                  aria-label="Send message"
                  className="flex-shrink-0 h-11 w-11"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-[#4a4a6a] text-center mt-2">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={Boolean(deleteSessionId)}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={() => {
          if (deleteSessionId) {
            deleteSession(deleteSessionId, {
              onSuccess: () => {
                if (activeSessionId === deleteSessionId) setActiveSessionId(null)
              },
            })
            setDeleteSessionId(null)
          }
        }}
        title="Delete chat?"
        description="This will permanently delete this chat session and all its messages."
        confirmLabel="Delete"
        destructive
        loading={deletingSession}
      />
    </div>
  )
}

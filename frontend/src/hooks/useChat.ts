import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { chatApi } from '@/lib/api'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage } from '@/lib/utils'
import type { ChatMessage } from '@/types'

type PagedMessages = {
  pages: Array<{ items: ChatMessage[]; has_next: boolean; page: number; per_page: number; total: number }>
  pageParams: number[]
}

export function useChatSessions(characterId: string) {
  return useQuery({
    queryKey: ['chatSessions', characterId],
    queryFn: () => chatApi.listSessions(characterId),
    enabled: Boolean(characterId),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  const { error: toastError } = useToast()

  return useMutation({
    mutationFn: ({
      characterId,
      title,
    }: {
      characterId: string
      title?: string
    }) => chatApi.createSession(characterId, title),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['chatSessions', session.character_id] })
    },
    onError: (err) => {
      toastError('Failed to create chat', getApiErrorMessage(err))
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => chatApi.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatSessions'] })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatApi.updateSession(id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatSessions'] })
    },
  })
}

export function useChatMessages(sessionId: string | null) {
  return useInfiniteQuery({
    queryKey: ['chatMessages', sessionId],
    queryFn: ({ pageParam = 1 }) =>
      chatApi.listMessages(sessionId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    enabled: Boolean(sessionId),
  })
}

/** Append a message to the LAST page of the paged cache (most recent). */
function appendToLastPage(old: PagedMessages | undefined, msg: ChatMessage): PagedMessages | undefined {
  if (!old) return old
  const pages = [...old.pages]
  const last = pages[pages.length - 1]
  pages[pages.length - 1] = { ...last, items: [...last.items, msg] }
  return { ...old, pages }
}

/** Remove a message by id from all pages. */
function removeFromPages(old: PagedMessages | undefined, id: string): PagedMessages | undefined {
  if (!old) return old
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      items: page.items.filter((m) => m.id !== id),
    })),
  }
}

export function useSendMessage(sessionId: string | null, characterId?: string) {
  const qc = useQueryClient()
  const { error: toastError } = useToast()

  return useMutation({
    mutationFn: (content: string) =>
      chatApi.sendMessage(sessionId!, { content }),

    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: ['chatMessages', sessionId] })

      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }

      qc.setQueryData<PagedMessages>(
        ['chatMessages', sessionId],
        (old) => appendToLastPage(old, optimisticMessage)
      )

      return { optimisticId: optimisticMessage.id }
    },

    onSuccess: (data, content, context) => {
      const assistantMessage = data.message
      const userMessage: ChatMessage = {
        id: context?.optimisticId ?? `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }

      qc.setQueryData<PagedMessages>(
        ['chatMessages', sessionId],
        (old) => {
          const without = removeFromPages(old, context?.optimisticId ?? '')
          return appendToLastPage(appendToLastPage(without, userMessage), assistantMessage)
        }
      )

      if (characterId) {
        qc.invalidateQueries({ queryKey: ['chatSessions', characterId] })
      }

      // Sync real message IDs from server in background
      void qc.invalidateQueries({ queryKey: ['chatMessages', sessionId] })
    },

    onError: (err, _content, context) => {
      // Roll back optimistic message
      if (context?.optimisticId) {
        qc.setQueryData<PagedMessages>(
          ['chatMessages', sessionId],
          (old) => removeFromPages(old, context.optimisticId)
        )
      }
      toastError('Failed to send message', getApiErrorMessage(err))
    },
  })
}

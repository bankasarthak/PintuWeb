'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateApi } from '@/lib/api'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage } from '@/lib/utils'
import type { CreateJobPayload } from '@/types'

export function useScenes() {
  return useQuery({
    queryKey: ['scenes'],
    queryFn: () => generateApi.getScenes(),
    staleTime: Infinity,
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => generateApi.getTemplates(),
    staleTime: Infinity,
  })
}

export function useMoods() {
  return useQuery({
    queryKey: ['moods'],
    queryFn: () => generateApi.getMoods(),
    staleTime: Infinity,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  const { error: toastError } = useToast()

  return useMutation({
    mutationFn: (payload: CreateJobPayload) => generateApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['gallery'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err) => {
      toastError('Generation failed', getApiErrorMessage(err))
    },
  })
}

export function useJobStatus(id: string | null) {
  return useQuery({
    queryKey: ['jobs', 'status', id],
    queryFn: () => generateApi.getJob(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return false
      if (status === 'queued' || status === 'claimed' || status === 'processing') return 2000
      return false
    },
  })
}

export function useJobs(characterId?: string, page = 1, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: ['jobs', 'list', characterId, page],
    queryFn: () => generateApi.listJobs(characterId, page),
    refetchInterval: options?.poll ? 5000 : false,
  })
}

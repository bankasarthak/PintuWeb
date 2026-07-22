'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { characterApi } from '@/lib/api'
import { useToast } from '@/stores/ui'
import { getApiErrorMessage } from '@/lib/utils'
import type { CreateCharacterPayload, UpdateCharacterPayload } from '@/types'

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: () => characterApi.list(),
  })
}

export function useCharacter(id: string) {
  return useQuery({
    queryKey: ['characters', id],
    queryFn: () => characterApi.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateCharacter(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  return useMutation({
    mutationFn: ({ payload, faceImage }: { payload: CreateCharacterPayload; faceImage?: File }) =>
      characterApi.create(payload, faceImage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
      success('Companion created', 'Your new companion is ready!')
      opts?.onSuccess?.()
    },
    onError: (err) => {
      toastError('Failed to create companion', getApiErrorMessage(err))
    },
  })
}

export function useUpdateCharacter() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      payload,
      faceImage,
    }: {
      id: string
      payload: UpdateCharacterPayload
      faceImage?: File
    }) => characterApi.update(id, payload, faceImage),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.setQueryData(['characters', updated.id], updated)
      success('Saved', 'Companion updated successfully')
    },
    onError: (err) => {
      toastError('Failed to update companion', getApiErrorMessage(err))
    },
  })
}

export function useDeleteCharacter() {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  return useMutation({
    mutationFn: (id: string) => characterApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
      success('Deleted', 'Companion deleted')
    },
    onError: (err) => {
      toastError('Failed to delete companion', getApiErrorMessage(err))
    },
  })
}

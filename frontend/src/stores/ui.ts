import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
}

interface UIStore {
  activeCompanionId: string | null
  setActiveCompanion: (id: string | null) => void
  setActiveCompanionId: (id: string | null) => void  // alias
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  generateModalOpen: boolean
  setGenerateModalOpen: (open: boolean) => void
  currentJobId: string | null
  setCurrentJobId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeCompanionId: null,
  setActiveCompanion: (id) => set({ activeCompanionId: id }),
  setActiveCompanionId: (id) => set({ activeCompanionId: id }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  generateModalOpen: false,
  setGenerateModalOpen: (open) => set({ generateModalOpen: open }),
  currentJobId: null,
  setCurrentJobId: (id) => set({ currentJobId: id }),
}))

export function useToast() {
  const addToast = useUIStore((s) => s.addToast)

  return {
    toast: (opts: Omit<Toast, 'id'>) => addToast(opts),
    success: (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
  }
}

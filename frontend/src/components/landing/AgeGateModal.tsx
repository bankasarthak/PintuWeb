'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'

const GATE_KEY = 'sofilthy-age-gate-v1'

export function AgeGateModal() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      if (sessionStorage.getItem(GATE_KEY) !== 'confirmed') {
        setVisible(true)
        document.body.style.overflow = 'hidden'
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const confirm = () => {
    try {
      sessionStorage.setItem(GATE_KEY, 'confirmed')
    } catch {
      /* ignore */
    }
    document.body.style.overflow = ''
    setVisible(false)
  }

  if (!mounted) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07070b]/95 backdrop-blur-xl px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
        >
          <div className="aurora-blob left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-[#ff2f87]/20" />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[#ff2f87]/25 bg-[#0f0f14] p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff2f87]/15">
              <ShieldAlert className="h-7 w-7 text-[#ff8ac2]" />
            </div>

            <h2 id="age-gate-title" className="font-display text-2xl font-bold text-white">
              Adults only
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#8b8fa8]">
              This site generates sexually explicit AI imagery and video from photos you provide.
              It is intended strictly for adults <span className="text-[#ff8ac2]">18 years or older</span>.
              By entering, you confirm you meet the legal age of majority in your jurisdiction and
              wish to view explicit content.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <button
                onClick={confirm}
                className="w-full rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] py-3 text-sm font-semibold text-[#07070b] shadow-lg shadow-[#ff2f87]/25 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Yes, I&apos;m 18 or older
              </button>
              <a
                href="https://www.google.com"
                className="w-full rounded-xl border border-white/[0.08] py-3 text-sm font-medium text-[#8b8fa8] transition-colors hover:bg-white/[0.04] hover:text-white cursor-pointer"
              >
                No, I&apos;m under 18
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

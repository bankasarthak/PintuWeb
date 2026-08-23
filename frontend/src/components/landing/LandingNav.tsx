'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Menu, Sparkles, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Templates', href: '#pillars' },
  { label: 'Story Mode', href: '#story-mode' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Pricing', href: '#pricing' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24)
  })

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(7,7,11,0.9)' : 'rgba(7,7,11,0.4)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6"
        style={{ height: scrolled ? 60 : 76 }}
      >
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2f87] to-[#ff8ac2] shadow-lg shadow-[#ff2f87]/25">
            <Sparkles className="h-4 w-4 text-[#07070b]" />
          </div>
          <span className="font-display text-lg font-bold text-white">soFilthy</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-[#8b8fa8] transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-[#8b8fa8] transition-all hover:bg-white/[0.04] hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] px-4 py-2 text-sm font-semibold text-[#07070b] shadow-lg shadow-[#ff2f87]/25 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            Start Generating
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-white/[0.06] bg-[#07070b]/95 px-4 pb-4 pt-2 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#8b8fa8] hover:bg-white/[0.04] hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] py-2.5 text-center text-sm font-semibold text-[#07070b]"
            >
              Start Generating
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}

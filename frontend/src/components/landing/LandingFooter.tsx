import Link from 'next/link'
import { Shield, Sparkles } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2f87] to-[#ff8ac2]">
              <Sparkles className="h-4 w-4 text-[#07070b]" />
            </div>
            <span className="font-display text-lg font-bold text-white">soFilthy</span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-[#8b8fa8]">
            <Link href="#" className="cursor-pointer transition-colors hover:text-white">Privacy</Link>
            <Link href="#" className="cursor-pointer transition-colors hover:text-white">Terms</Link>
            <Link href="#" className="cursor-pointer transition-colors hover:text-white">Support</Link>
            <Link href="#" className="cursor-pointer transition-colors hover:text-white">Contact</Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-[#8b8fa8]">
            &copy; {new Date().getFullYear()} soFilthy. All rights reserved. 18+ adult platform.
          </p>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-[#8b8fa8]">
            <Shield className="h-3 w-3" />
            Adults only (18+)
          </div>
        </div>
      </div>
    </footer>
  )
}

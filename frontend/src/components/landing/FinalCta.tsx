'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6">
      <div className="aurora-blob left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-[#ff2f87]/20" />
      <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-bold text-white sm:text-5xl">
          Her next scene is <span className="text-gradient">one photo away.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[#8b8fa8]">
          Start with 5 free credits. No subscription, no waiting list.
        </p>
        <Link
          href="/login"
          className="mt-9 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] px-8 py-4 text-base font-semibold text-[#07070b] shadow-2xl shadow-[#ff2f87]/30 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
        >
          Start Generating
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </section>
  )
}

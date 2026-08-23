'use client'

import { CountUp, Reveal } from './Reveal'

const STATS = [
  { value: 130, prefix: '', suffix: '+', label: 'ready-made templates' },
  { value: 50000, prefix: '', suffix: '+', label: 'videos generated' },
  { value: 3, prefix: '<', suffix: ' min', label: 'average generation time' },
  { value: 5, prefix: '', suffix: '', label: 'free credits to start' },
]

export function StatsBand() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.02] py-14 px-4 sm:px-6">
      <Reveal className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <CountUp
              value={s.value}
              prefix={s.prefix}
              suffix={s.suffix}
              className="font-display text-3xl font-bold text-gradient sm:text-4xl"
            />
            <p className="mt-1.5 text-xs text-[#8b8fa8] sm:text-sm">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

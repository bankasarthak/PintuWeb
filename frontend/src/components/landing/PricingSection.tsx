'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { Reveal } from './Reveal'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'to start',
    credits: 5,
    features: ['5 free credits on signup', 'Access to all templates', 'Director & Custom Prompt', 'Standard generation queue'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Basic',
    price: '₹75',
    period: 'one-time',
    credits: 20,
    features: ['20 credits', 'Basic priority queue', 'All templates unlocked', 'Story Mode included'],
    cta: 'Buy Basic',
    highlight: false,
  },
  {
    name: 'Mid',
    price: '₹300',
    period: 'one-time',
    credits: 100,
    features: ['100 credits', 'Mid priority queue', 'Faster generation', 'Best value per credit'],
    cta: 'Buy Mid',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '₹750',
    period: 'one-time',
    credits: 300,
    features: ['300 credits', 'Top priority queue', 'Fastest generation', 'For power users'],
    cta: 'Buy Pro',
    highlight: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Simple, <span className="text-gradient">pay-as-you-go</span> pricing
          </h2>
          <p className="mt-4 text-lg text-[#8b8fa8]">No subscription. Buy credits once, use them whenever.</p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.06}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1',
                  plan.highlight
                    ? 'border-[#ff2f87]/50 bg-gradient-to-b from-[#ff2f87]/10 to-[#0f0f14] animate-pulse-glow'
                    : 'border-white/[0.08] bg-[#0f0f14]'
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] px-3 py-1 text-xs font-semibold text-[#07070b] shadow-lg shadow-[#ff2f87]/25">
                    Best value
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-[#8b8fa8]">/ {plan.period}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-[#ff8ac2]">{plan.credits} credits</p>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#8b8fa8]">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ff2f87]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={cn(
                    'mt-6 w-full cursor-pointer rounded-xl py-2.5 text-center text-sm font-semibold transition-all',
                    plan.highlight
                      ? 'bg-gradient-to-r from-[#ff2f87] to-[#ff8ac2] text-[#07070b] hover:scale-[1.02]'
                      : 'border border-white/[0.08] text-white hover:bg-white/[0.04]'
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

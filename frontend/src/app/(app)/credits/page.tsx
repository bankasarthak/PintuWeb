'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, CheckCircle2, TrendingUp, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCredits, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { UsageRecord } from '@/types'

const packages = [
  {
    id: 'basic',
    name: 'Basic',
    credits: 100,
    price_inr: 199,
    priceDisplay: '₹199',
    perCredit: '₹1.99/credit',
    features: ['100 credits', 'Valid forever', 'All features'],
    popular: false,
    color: 'border-[#1e1e2e]',
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 300,
    price_inr: 499,
    priceDisplay: '₹499',
    perCredit: '₹1.66/credit',
    features: ['300 credits', 'Valid forever', '17% savings', 'Priority queue'],
    popular: true,
    color: 'border-purple-600/60',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 700,
    price_inr: 999,
    priceDisplay: '₹999',
    perCredit: '₹1.43/credit',
    features: ['700 credits', 'Valid forever', '29% savings', 'Priority queue', 'All scenes'],
    popular: false,
    color: 'border-[#1e1e2e]',
  },
]

export default function CreditsPage() {
  const user = useAuthStore((s) => s.user)
  const { info } = useToast()
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: () =>
      api
        .get<{ items: UsageRecord[]; total: number }>('/credits/usage', {
          params: { page: 1, per_page: 20 },
        })
        .then((r) => r.data),
  })

  const handleBuy = (pkg: typeof packages[0]) => {
    setBuyingId(pkg.id)
    info('Payment coming soon', 'We are setting up payment processing. Check back soon!')
    setTimeout(() => setBuyingId(null), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-[#94a3b8] mt-1">Purchase credits to generate photos and videos</p>
      </div>

      {/* Balance Card */}
      <Card glow className="mb-8">
        <CardContent className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-600/20 flex items-center justify-center">
            <Coins className="h-7 w-7 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-[#94a3b8]">Current balance</p>
            <p className="text-3xl font-bold text-white mt-0.5">
              {formatCredits(user?.credits ?? 0)}{' '}
              <span className="text-lg font-normal text-[#94a3b8]">credits</span>
            </p>
          </div>
          <div className="ml-auto hidden sm:flex flex-col items-end gap-1">
            <Badge variant="purple">
              <TrendingUp className="h-2.5 w-2.5 mr-1" />
              Active account
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Buy Credits</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'relative rounded-2xl border p-6 flex flex-col transition-all hover:scale-[1.02]',
                pkg.popular
                  ? 'border-purple-600/60 bg-purple-900/10 shadow-lg shadow-purple-900/20'
                  : 'border-[#1e1e2e] bg-[#13131a]'
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-900/30">
                    Best value
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-white">{pkg.priceDisplay}</span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">{pkg.perCredit}</p>
              </div>

              <ul className="flex flex-col gap-2 flex-1 mb-5">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={pkg.popular ? 'default' : 'outline'}
                className="w-full"
                loading={buyingId === pkg.id}
                onClick={() => handleBuy(pkg)}
                leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}
                aria-label={`Buy ${pkg.name} package - ${pkg.credits} credits for ${pkg.priceDisplay}`}
              >
                Buy {pkg.credits} credits
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Usage History</h2>

        {usageLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !usageData?.items || usageData.items.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-[#94a3b8] text-sm">No usage history yet</p>
            <p className="text-xs text-[#4a4a6a] mt-1">Your credit usage will appear here</p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e2e]">
                    <th className="text-left py-3 px-4 text-[#94a3b8] font-medium">Action</th>
                    <th className="text-left py-3 px-4 text-[#94a3b8] font-medium">Credits</th>
                    <th className="text-left py-3 px-4 text-[#94a3b8] font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.items.map((record) => (
                    <tr key={record.id} className="border-b border-[#1e1e2e] last:border-0">
                      <td className="py-3 px-4 text-white capitalize">{record.action}</td>
                      <td className="py-3 px-4">
                        <span className="text-red-400">-{record.credits_used}</span>
                      </td>
                      <td className="py-3 px-4 text-[#94a3b8]">{formatDateTime(record.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

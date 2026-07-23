'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Coins,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  ExternalLink,
  Bitcoin,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/ui'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCredits, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api, { authApi } from '@/lib/api'
import type { CreditPackage, PaymentOrder, UsageRecord } from '@/types'

type BuyingKey = string | null

export default function CreditsPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { success, error: toastError, info } = useToast()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [buyingKey, setBuyingKey] = useState<BuyingKey>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => api.get<CreditPackage[]>('/credits/packages').then((r) => r.data),
  })

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: () =>
      api
        .get<{ items: UsageRecord[]; total: number }>('/credits/usage', {
          params: { page: 1, per_page: 20 },
        })
        .then((r) => r.data),
  })

  const refreshBalance = async (message?: string) => {
    try {
      const fresh = await authApi.me()
      setUser(fresh)
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      if (message) {
        success('Payment received', message)
      }
    } catch {
      toastError('Could not refresh balance', 'Try reloading the page in a few seconds.')
    }
  }

  useEffect(() => {
    const payment = searchParams.get('payment')
    const orderId = searchParams.get('order_id')

    if (payment === 'cancelled') {
      info('Payment cancelled', 'You can try again anytime.')
      return
    }

    if (payment !== 'success') return

    const pollOrder = async (id: string) => {
      try {
        const { data } = await api.get<PaymentOrder>(`/credits/orders/${id}`)
        if (data.status === 'finished' || data.fulfilled_at) {
          if (pollRef.current) clearInterval(pollRef.current)
          await refreshBalance('Your credits have been added.')
          return true
        }
      } catch {
        /* keep polling */
      }
      return false
    }

    refreshBalance(
      'Payment submitted — credits are added once the blockchain confirms (usually 1–10 min).'
    )

    if (orderId) {
      void pollOrder(orderId)
      pollRef.current = setInterval(() => {
        void pollOrder(orderId)
      }, 8000)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [searchParams, setUser, success, toastError, info, queryClient])

  const checkoutError = (err: unknown, fallback: string) => {
    const message =
      err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null
    toastError('Checkout failed', message || fallback)
    setBuyingKey(null)
  }

  const handleUpiBuy = async (pkg: CreditPackage) => {
    setBuyingKey(`${pkg.id}-upi`)
    try {
      const { data } = await api.post<{ short_url: string | null }>(
        '/credits/checkout/razorpay',
        { plan_id: pkg.id }
      )
      if (!data.short_url) throw new Error('No payment URL returned')
      window.location.href = data.short_url
    } catch (err) {
      checkoutError(err, 'Could not start UPI payment. Try again.')
    }
  }

  const handleCryptoBuy = async (pkg: CreditPackage) => {
    setBuyingKey(`${pkg.id}-crypto`)
    try {
      const { data } = await api.post<{ invoice_url: string | null }>(
        '/credits/checkout/nowpayments',
        { plan_id: pkg.id }
      )
      if (!data.invoice_url) throw new Error('No invoice URL returned')
      window.location.href = data.invoice_url
    } catch (err) {
      checkoutError(err, 'Could not start crypto payment. Try again.')
    }
  }

  const anyCrypto = packages?.some((p) => p.crypto_enabled)
  const anyUpi = packages?.some((p) => p.razorpay_enabled)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-[#94a3b8] mt-1">
          Recharge with UPI (India) or crypto (BTC, ETH, USDT, and more)
        </p>
      </div>

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

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Recharge packs</h2>

        {packagesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(packages ?? []).map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-[#12121a] p-5',
                  pkg.popular ? 'border-purple-600/60' : 'border-[#1e1e2e]'
                )}
              >
                {pkg.popular && (
                  <Badge variant="purple" className="absolute -top-2.5 left-4">
                    Most popular
                  </Badge>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                  <div className="flex flex-col gap-0.5 mt-2">
                    {anyUpi && (
                      <span className="text-2xl font-bold text-white">₹{pkg.price_inr}</span>
                    )}
                    {anyCrypto && (
                      <span className="text-lg font-semibold text-[#cbd5e1]">
                        ${pkg.price_usd} crypto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    {pkg.credits} credits · {pkg.queue}
                  </p>
                </div>

                <ul className="flex flex-col gap-2 flex-1 mb-5">
                  <li className="flex items-center gap-2 text-sm text-[#94a3b8]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    {pkg.credits} credits
                  </li>
                  <li className="flex items-center gap-2 text-sm text-[#94a3b8]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    {pkg.queue}
                  </li>
                </ul>

                <div className="flex flex-col gap-2">
                  {pkg.razorpay_enabled !== false && anyUpi && (
                    <Button
                      variant={pkg.popular ? 'default' : 'outline'}
                      className="w-full"
                      loading={buyingKey === `${pkg.id}-upi`}
                      onClick={() => handleUpiBuy(pkg)}
                      leftIcon={
                        buyingKey === `${pkg.id}-upi` ? (
                          <ExternalLink className="h-3.5 w-3.5" />
                        ) : (
                          <ShoppingCart className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      Pay ₹{pkg.price_inr} via UPI
                    </Button>
                  )}
                  {pkg.crypto_enabled !== false && anyCrypto && (
                    <Button
                      variant="outline"
                      className="w-full border-amber-600/40 hover:border-amber-500/60"
                      loading={buyingKey === `${pkg.id}-crypto`}
                      onClick={() => handleCryptoBuy(pkg)}
                      leftIcon={
                        buyingKey === `${pkg.id}-crypto` ? (
                          <ExternalLink className="h-3.5 w-3.5" />
                        ) : (
                          <Bitcoin className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      Pay ${pkg.price_usd} with crypto
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                      <td className="py-3 px-4 text-white">{record.action}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            record.credits_used >= 0 ? 'text-green-400' : 'text-red-400'
                          )}
                        >
                          {record.credits_used >= 0 ? '+' : ''}
                          {formatCredits(record.credits_used)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#94a3b8]">
                        {formatDateTime(record.created_at)}
                      </td>
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

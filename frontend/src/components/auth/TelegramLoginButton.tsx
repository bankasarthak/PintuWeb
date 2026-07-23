'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTelegramLogin } from '@/hooks/useAuth'
import type { TelegramLoginPayload } from '@/types'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void
  }
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ''
const LOGIN_DOMAIN =
  process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_DOMAIN || 'bot.krewbay.in'

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isStandardWebPort(port: string): boolean {
  return port === '' || port === '80' || port === '443'
}

export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { mutate: loginWithTelegram, isPending } = useTelegramLogin()
  const [hostname, setHostname] = useState('')
  const [port, setPort] = useState('')

  useEffect(() => {
    setHostname(window.location.hostname)
    setPort(window.location.port)
  }, [])

  const domainMismatch = useMemo(() => {
    if (!hostname) return false
    return hostname !== LOGIN_DOMAIN
  }, [hostname])

  const portMismatch = useMemo(() => {
    if (!hostname || domainMismatch) return false
    return !isStandardWebPort(port)
  }, [hostname, port, domainMismatch])

  const localDevUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${LOGIN_DOMAIN}${window.location.pathname}`
      : `http://${LOGIN_DOMAIN}/login`

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      loginWithTelegram(user)
    }

    return () => {
      delete window.onTelegramAuth
    }
  }, [loginWithTelegram])

  useEffect(() => {
    if (!BOT_USERNAME || !containerRef.current || domainMismatch || portMismatch) return

    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    containerRef.current.appendChild(script)
  }, [domainMismatch, portMismatch])

  if (!BOT_USERNAME) {
    return (
      <p className="text-sm text-[#94a3b8] text-center">
        Telegram sign-in is not configured yet.
      </p>
    )
  }

  if (portMismatch && hostname) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[#e2e8f0] space-y-2">
        <p className="font-medium text-amber-200">Telegram login requires port 80</p>
        <p className="text-[#94a3b8] leading-relaxed">
          You are on <code className="text-amber-100">:{port || '3000'}</code>, but Telegram only
          allows <code className="text-amber-100">http://{LOGIN_DOMAIN}</code> (no port).
        </p>
        <p className="text-[#94a3b8] leading-relaxed">
          Run the dev server on port 80:
        </p>
        <pre className="text-xs text-[#94a3b8] bg-[#0a0a0f] rounded-lg p-3 overflow-x-auto">
          cd frontend{'\n'}sudo npm run dev:auth
        </pre>
        <p className="text-[#94a3b8] leading-relaxed">
          Then open <code className="text-amber-100">{localDevUrl}</code>
        </p>
      </div>
    )
  }

  if (domainMismatch && hostname) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[#e2e8f0] space-y-2">
        <p className="font-medium text-amber-200">Telegram login needs a registered domain</p>
        <p className="text-[#94a3b8] leading-relaxed">
          The widget does not work on <code className="text-amber-100">{hostname}</code>.
          Use <code className="text-amber-100">{LOGIN_DOMAIN}</code> instead (same bot domain as production).
        </p>
        {isLocalDevHost(hostname) && (
          <p className="text-[#94a3b8] leading-relaxed">
            For local dev, add <code className="text-amber-100">127.0.0.1 {LOGIN_DOMAIN}</code> to{' '}
            <code className="text-amber-100">/etc/hosts</code>, then open:
          </p>
        )}
        <a
          href={localDevUrl}
          className="inline-flex text-sm font-medium text-[#c9a962] hover:text-[#dfc07a] transition-colors"
        >
          Open {localDevUrl}
        </a>
        <p className="text-xs text-[#64748b]">
          In @BotFather run: <code>/setdomain @{BOT_USERNAME} {LOGIN_DOMAIN}</code>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div ref={containerRef} className="min-h-[44px] flex items-center justify-center" />
      {isPending && (
        <p className="text-xs text-[#94a3b8]" aria-live="polite">
          Signing in with Telegram…
        </p>
      )}
    </div>
  )
}

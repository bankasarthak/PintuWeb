import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AuthProviders } from '@/components/auth/AuthProviders'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <div className="min-h-screen bg-[#07070b] flex flex-col">
        <header className="p-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#c9a962] to-[#8b7355] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#07070b]" />
            </div>
            <span className="text-lg font-bold text-white font-display">Pintu</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">{children}</main>

        <footer className="p-6 text-center">
          <p className="text-xs text-[#94a3b8]">
            18+ platform. By continuing, you confirm you are 18 or older.
          </p>
        </footer>
      </div>
    </AuthProviders>
  )
}

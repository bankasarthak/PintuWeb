import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Pintu</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-[#94a3b8]">
          18+ platform. By continuing, you confirm you are 18 or older.
        </p>
      </footer>
    </div>
  )
}

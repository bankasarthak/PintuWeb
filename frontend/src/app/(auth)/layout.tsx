import Image from 'next/image'
import Link from 'next/link'
import { AuthProviders } from '@/components/auth/AuthProviders'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <div className="min-h-screen bg-[#07070b] flex flex-col">
        <header className="p-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo-icon.png" alt="JerkBox" width={44} height={44} className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-bold text-white font-display">JerkBox</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">{children}</main>

        <footer className="p-6 text-center">
          <p className="text-xs text-[#8b8fa8]">
            18+ platform. By continuing, you confirm you are 18 or older.
          </p>
        </footer>
      </div>
    </AuthProviders>
  )
}

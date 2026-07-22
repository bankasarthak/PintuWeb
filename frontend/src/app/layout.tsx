import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/lib/query-client'
import { ToastContainer } from '@/components/ui/toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Pintu – Your AI Companion',
  description: 'Real conversations. Explicit photos. Cinematic videos. Your AI companion awaits.',
  keywords: ['AI companion', 'AI chat', 'AI girlfriend', 'AI photos'],
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-[#0a0a0f] text-white antialiased min-h-screen">
        <ReactQueryProvider>
          {children}
          <ToastContainer />
        </ReactQueryProvider>
      </body>
    </html>
  )
}

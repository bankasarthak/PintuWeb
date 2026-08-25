import type { Metadata } from 'next'
import { Manrope, Syne } from 'next/font/google'
import './globals.css'
import { ReactQueryProvider } from '@/lib/query-client'
import { ToastContainer } from '@/components/ui/toast'

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['700', '800'],
})

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'JerkBox - Animate Any Photo Into Explicit AI Video',
  description: 'Upload one photo. Pick a template, direct your own scene, or write the script - JerkBox animates it into an explicit, cinematic video in under a minute.',
  keywords: ['AI video generator', 'photo to video AI', 'AI NSFW video', 'AI companion'],
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className="bg-[#07070b] text-white antialiased min-h-screen">
        <ReactQueryProvider>
          {children}
          <ToastContainer />
        </ReactQueryProvider>
      </body>
    </html>
  )
}

'use client'

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md animate-in">
      <CardHeader>
        <CardTitle className="text-2xl text-center font-display">Welcome to JerkBox</CardTitle>
        <CardDescription className="text-center">
          Sign in with Google or Telegram to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoogleSignInButton />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-xs text-[#8b8fa8] uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <TelegramLoginButton />

        <p className="text-xs text-[#8b8fa8] text-center mt-2 leading-relaxed">
          By continuing, you confirm you are 18 or older and agree to our terms of service.
        </p>
      </CardContent>
    </Card>
  )
}

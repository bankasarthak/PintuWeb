'use client'

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useGoogleLogin } from '@/hooks/useAuth'

export function GoogleSignInButton() {
  const { mutate: loginWithGoogle, isPending } = useGoogleLogin()
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    return (
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4 text-sm space-y-2">
        <p className="font-medium text-white">Google sign-in not configured</p>
        <p className="text-[#94a3b8] leading-relaxed">
          Add a Google OAuth Web Client ID to{' '}
          <code className="text-[#c9a962]">frontend/.env.local</code>:
        </p>
        <pre className="text-xs text-[#94a3b8] bg-[#0a0a0f] rounded-lg p-3 overflow-x-auto">
          NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
        </pre>
        <p className="text-xs text-[#64748b]">
          Also set the same value as <code>GOOGLE_CLIENT_ID</code> on the PintuWeb backend.
          Authorized origin: <code>http://bot.krewbay.in:3000</code> (local) or your prod URL.
        </p>
      </div>
    )
  }

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) return
    loginWithGoogle(response.credential)
  }

  return (
    <div className="w-full flex justify-center [&>div]:w-full [&>div>div]:!w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => undefined}
        theme="filled_black"
        size="large"
        shape="pill"
        text="continue_with"
        width={360}
        useOneTap={false}
      />
      {isPending && (
        <span className="sr-only" aria-live="polite">
          Signing in with Google…
        </span>
      )}
    </div>
  )
}

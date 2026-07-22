'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useRegister } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const signupSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { mutate: register, isPending } = useRegister()

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = (data: SignupForm) => {
    register({
      email: data.email,
      password: data.password,
      display_name: data.display_name || undefined,
    })
  }

  return (
    <Card className="w-full max-w-md animate-in">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create your account</CardTitle>
        <CardDescription className="text-center">
          Join Pintu — your AI companion platform. 18+ only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Display name (optional)"
            type="text"
            placeholder="How should we call you?"
            autoComplete="name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.display_name?.message}
            {...registerField('display_name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...registerField('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-[#94a3b8] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
            {...registerField('password')}
          />

          <Input
            label="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="text-[#94a3b8] hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.confirmPassword?.message}
            {...registerField('confirmPassword')}
          />

          <p className="text-xs text-[#94a3b8] -mt-1">
            By creating an account you confirm you are 18 or older and agree to our terms of service.
          </p>

          <Button
            type="submit"
            loading={isPending}
            size="lg"
            className="w-full mt-2"
            aria-label="Create account"
          >
            Create free account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#94a3b8]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

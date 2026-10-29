'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { api, ApiError, preferredPostLoginDestination } from '@/lib/api'
import { queueLoginSuccessToast } from '@/lib/login-success-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginSchema } from '@/lib/auth-schemas'

type FormValues = { email: string; password: string }

export default function LoginForm({ returnTo = '/workspaces', audience = 'firm', onAuthenticated }: {
  returnTo?: string
  audience?: 'firm' | 'lawyer' | 'assistant' | 'administration'
  onAuthenticated?: () => void | Promise<void>
}) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      const login = await api.login(email, password, audience)
      if (login.mfaRequired) { setMfaRequired(true); return }
      await finishAuthentication()
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401
        ? 'Email or password is incorrect.'
        : reason instanceof Error ? reason.message : 'Sign in could not be completed.')
    }
  })

  async function finishAuthentication() {
      // Confirm the new server-managed cookie before changing authenticated UI state.
      const current = await api.currentUser()
      const workspaces = await api.workspaces()
      const destination = preferredPostLoginDestination(current, returnTo, workspaces)
      if (onAuthenticated) {
        await onAuthenticated()
        queueLoginSuccessToast(destination)
      } else {
        queueLoginSuccessToast(destination)
        router.replace(destination)
      }
  }

  const submitMfa = async () => {
    setError(null)
    try { await api.mfaChallenge(mfaCode); await finishAuthentication() }
    catch { setError('The verification code is invalid or expired. Try again or use a recovery code.') }
  }

  return mfaRequired ? <form onSubmit={(event) => { event.preventDefault(); void submitMfa() }} noValidate className='space-y-5'>
      <div className='space-y-2'><label htmlFor='mfa-code' className='text-sm font-medium'>{useRecoveryCode ? 'Recovery code' : 'Authenticator code'}</label>
        <Input id='mfa-code' autoComplete='one-time-code' maxLength={useRecoveryCode ? 32 : 6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} required /></div>
      {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
      <button type='button' className='text-sm underline' onClick={() => { setUseRecoveryCode((v) => !v); setMfaCode('') }}>{useRecoveryCode ? 'Use authenticator code' : 'Use a recovery code'}</button>
      <Button type='submit' className='w-full'>Verify and sign in</Button>
    </form> : <form onSubmit={submit} noValidate className='space-y-5' aria-busy={isSubmitting}>
      <div className='space-y-2'>
        <label htmlFor='email' className='text-sm font-medium'>Email address</label>
        <Input id='email' type='email' autoComplete='username' inputMode='email' maxLength={320}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')} />
        {errors.email && <p id='email-error' className='text-sm text-destructive'>{errors.email.message}</p>}
      </div>
      <div className='space-y-2'>
        <label htmlFor='password' className='text-sm font-medium'>Password</label>
        <div className='relative'>
          <Input id='password' type={showPassword ? 'text' : 'password'} autoComplete='current-password'
            className='pr-12' aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
          <button type='button' onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className='absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'>
            {showPassword ? <EyeOff className='size-4' aria-hidden='true' /> : <Eye className='size-4' aria-hidden='true' />}
          </button>
        </div>
        {errors.password && <p id='password-error' className='text-sm text-destructive'>{errors.password.message}</p>}
      </div>
      {error && <p role='alert' className='rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive'>{error}</p>}
      <Button type='submit' className='w-full' disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className='mr-2 size-4 animate-spin' aria-hidden='true' />}
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <a href='/pages/auth/forgot-password' className='block text-center text-sm underline'>Forgot your password?</a>
    </form>
}

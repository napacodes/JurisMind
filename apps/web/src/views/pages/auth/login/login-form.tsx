'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { api, ApiError, safeReturnTo } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginSchema } from '@/lib/auth-schemas'

type FormValues = { email: string; password: string }

export default function LoginForm({ returnTo = '/workspaces', onAuthenticated }: {
  returnTo?: string
  onAuthenticated?: () => void | Promise<void>
}) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      await api.login(email, password)
      // Confirm the new server-managed cookie before changing authenticated UI state.
      await api.currentUser()
      await api.workspaces()
      if (onAuthenticated) await onAuthenticated()
      else router.replace(safeReturnTo(returnTo))
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401
        ? 'Email or password is incorrect.'
        : reason instanceof Error ? reason.message : 'Sign in could not be completed.')
    }
  })

  return (
    <form onSubmit={submit} noValidate className='space-y-5' aria-busy={isSubmitting}>
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
    </form>
  )
}

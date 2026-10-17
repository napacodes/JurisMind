'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoaderCircle, Scale } from 'lucide-react'
import { AuthGate } from './AuthGate'
import { useAuth } from './AuthProvider'
import { ApiError, api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { individualPracticeSchema } from '@/lib/auth-schemas'

type Values = { name: string }

function OnboardingForm() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<{ name: string; key: string } | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(individualPracticeSchema), defaultValues: { name: '' },
  })

  const submit = handleSubmit(async ({ name }) => {
    setError(null)
    const currentAttempt = attempt?.name === name ? attempt : { name, key: crypto.randomUUID() }
    if (currentAttempt !== attempt) setAttempt(currentAttempt)
    try {
      const result = await api.provisionIndividual(name, currentAttempt.key)
      await refresh()
      setAttempt(null)
      router.replace(`/dashboard?workspaceId=${encodeURIComponent(result.workspace.id)}`)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) setAttempt(null)
      setError(reason instanceof ApiError && reason.status === 409
        ? 'This request conflicts with the current account state. Review your workspaces and try again with a new submission.'
        : reason instanceof Error ? reason.message : 'Workspace setup could not be completed. You can retry safely from this page.')
    }
  })

  return <form className='space-y-5' onSubmit={submit} noValidate aria-busy={isSubmitting}>
    <div className='space-y-2'><label htmlFor='workspace-name' className='text-sm font-medium'>Workspace name</label>
      <Input id='workspace-name' maxLength={200} autoComplete='organization' aria-invalid={Boolean(errors.name)}
        aria-describedby={errors.name ? 'workspace-name-error' : 'workspace-name-help'} {...register('name')} />
      <p id='workspace-name-help' className='text-xs text-muted-foreground'>You will be the primary lawyer. Assistants can be invited later.</p>
      {errors.name && <p id='workspace-name-error' className='text-sm text-destructive'>{errors.name.message}</p>}
    </div>
    {error && <p role='alert' className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>{error}</p>}
    <Button type='submit' disabled={isSubmitting} className='w-full'>{isSubmitting && <LoaderCircle className='mr-2 size-4 animate-spin' aria-hidden='true' />}{isSubmitting ? 'Creating workspace…' : 'Create individual practice'}</Button>
  </form>
}

export default function IndividualPracticeOnboarding() {
  return <AuthGate><main className='mx-auto grid min-h-[85vh] w-full max-w-xl place-items-center px-4 py-12'><section className='w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8'>
    <div className='mb-5 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary'><Scale className='size-6' aria-hidden='true' /></div>
    <h1 className='text-2xl font-semibold tracking-tight'>Set up your individual practice</h1>
    <p className='mt-2 mb-6 text-sm text-muted-foreground'>This creates a workspace and primary lawyer membership for your existing account. It does not create matters or grant access to confidential records.</p>
    <OnboardingForm />
  </section></main></AuthGate>
}

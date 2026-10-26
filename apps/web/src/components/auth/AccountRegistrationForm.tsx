'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, api, preferredPostLoginDestination } from '@/lib/api'
import { queueLoginSuccessToast } from '@/lib/login-success-toast'
import { firmRegistrationSchema, lawyerRegistrationSchema } from '@/lib/auth-schemas'

type RegistrationKind = 'firm' | 'lawyer'
type Values = { fullName: string; email: string; password: string; firmName: string }

export function AccountRegistrationForm({ kind }: { kind: RegistrationKind }) {
  const router = useRouter()
  const [values, setValues] = useState<Values>({ fullName: '', email: '', password: '', firmName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const schema = kind === 'firm' ? firmRegistrationSchema : lawyerRegistrationSchema
    const input = kind === 'firm' ? values : { fullName: values.fullName, email: values.email, password: values.password }
    const parsed = schema.safeParse(input)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Review the account details and try again.'); return }
    setBusy(true)
    try {
      if (kind === 'firm') await api.registerFirm(parsed.data as { fullName: string; email: string; password: string; firmName: string })
      else await api.registerLawyer(parsed.data as { fullName: string; email: string; password: string })
      const [current, workspaces] = await Promise.all([api.currentUser(), api.workspaces()])
      const destination = preferredPostLoginDestination(current, '/workspaces', workspaces)
      queueLoginSuccessToast(destination)
      router.replace(destination)
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409
        ? 'An account could not be created with those details. Check the email and try signing in if you already registered.'
        : reason instanceof Error ? reason.message : 'Registration could not be completed. Try again.')
    } finally { setBusy(false) }
  }

  const update = (field: keyof Values) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  return <form onSubmit={(event) => void submit(event)} className='space-y-4' noValidate aria-busy={busy}>
    {kind === 'firm' && <Field label='Firm name' htmlFor='firm-name'><Input id='firm-name' autoComplete='organization' maxLength={200} required value={values.firmName} onChange={update('firmName')} /></Field>}
    <Field label='Administrator name' htmlFor='full-name'><Input id='full-name' autoComplete='name' maxLength={200} required value={values.fullName} onChange={update('fullName')} /></Field>
    <Field label='Email address' htmlFor='email'><Input id='email' type='email' autoComplete='email' maxLength={320} required value={values.email} onChange={update('email')} /></Field>
    <Field label='Password' htmlFor='password'><div className='relative'><Input id='password' type={showPassword ? 'text' : 'password'} autoComplete='new-password' minLength={12} maxLength={256} required className='pr-12' value={values.password} onChange={update('password')} /><button type='button' onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className='absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground'>{showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}</button></div><span className='text-xs text-slate-400'>Use at least 12 characters.</span></Field>
    {kind === 'lawyer' && <p className='rounded-lg border border-teal-100/10 bg-teal-100/[.04] p-3 text-xs leading-5 text-slate-300'>This creates an individual-practice workspace and primary lawyer membership. It does not verify professional credentials or grant access to client records.</p>}
    {error && <p role='alert' className='rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-200'>{error}</p>}
    <Button type='submit' className='w-full' disabled={busy}>{busy && <LoaderCircle className='mr-2 size-4 animate-spin' aria-hidden='true' />}{busy ? 'Creating account…' : kind === 'firm' ? 'Create firm account' : 'Create lawyer account'}</Button>
    <p className='text-center text-sm text-slate-400'>Already registered? <Link className='text-teal-200 underline-offset-4 hover:underline' href={kind === 'firm' ? '/firm/login' : '/lawyer/login'}>Sign in</Link></p>
  </form>
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className='block space-y-2 text-sm font-medium text-slate-200'>{label}{children}</label>
}

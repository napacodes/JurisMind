'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try { await api.resetRequest(email); setSent(true) }
    catch { setError('We could not process the request. Please try again.') }
    finally { setBusy(false) }
  }
  return sent ? <p role='status' className='text-sm'>If an eligible account exists, password reset instructions will be sent.</p> : <form onSubmit={submit} className='space-y-4'>
    <label className='block space-y-2 text-sm font-medium' htmlFor='reset-email'>Email address<Input id='reset-email' type='email' autoComplete='email' maxLength={320} required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
    <Button className='w-full' type='submit' disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
  </form>
}

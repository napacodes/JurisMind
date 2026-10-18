'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function resetTokenFromFragment(hash: string): string | null {
  if (!hash.startsWith('#')) return null
  const raw = new URLSearchParams(hash.slice(1)).get('token')
  return raw && /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null
}

export default function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoaded, setTokenLoaded] = useState(false)
  const capturedToken = useRef<string | null | undefined>(undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    // React Strict Mode replays effects in development. Cache the parsed token
    // before removing the fragment so the replay cannot replace it with null.
    if (capturedToken.current === undefined) {
      capturedToken.current = resetTokenFromFragment(window.location.hash)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setToken(capturedToken.current)
    setTokenLoaded(true)
  }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) { setMessage('Passwords do not match.'); return }
    if (!token) { setMessage('This reset link is invalid or expired. Request a new link.'); return }
    setBusy(true); setMessage('')
    try { await api.resetComplete(token, password); setToken(null); setMessage('Password updated. You can now sign in.') }
    catch { setMessage('This reset link is invalid or expired. Request a new link.') }
    finally { setBusy(false); setPassword(''); setConfirm('') }
  }
  return <form onSubmit={submit} className='space-y-4'>
    {!tokenLoaded && <p role='status'>Checking reset link…</p>}
    {tokenLoaded && !token && !message && <p role='status'>This reset link is invalid or expired. <Link className='underline' href='/pages/auth/forgot-password'>Request a new link</Link></p>}
    {token && <>
      <label className='block space-y-2 text-sm font-medium' htmlFor='new-password'>New password<Input id='new-password' type='password' autoComplete='new-password' minLength={12} maxLength={256} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className='block space-y-2 text-sm font-medium' htmlFor='confirm-password'>Confirm password<Input id='confirm-password' type='password' autoComplete='new-password' minLength={12} maxLength={256} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      <Button className='w-full' type='submit' disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</Button>
    </>}
    {message && <p role='status' className='text-sm'>{message} {message.startsWith('Password updated') && <Link className='underline' href='/pages/auth/login'>Sign in</Link>}</p>}
  </form>
}

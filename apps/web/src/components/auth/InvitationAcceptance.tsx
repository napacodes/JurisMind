'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LoaderCircle, MailCheck } from 'lucide-react'
import { AuthProvider, useAuth } from './AuthProvider'
import { StatusPage } from './AuthGate'
import { ApiError, api, invitationTokenFromFragment } from '@/lib/api'
import { Button } from '@/components/ui/button'

function AcceptanceFlow() {
  const { state, refresh } = useAuth()
  const router = useRouter()
  const started = useRef(false)
  const consumedFragment = useRef<string | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [checking, setChecking] = useState(false)

  const accept = async () => {
    if (!token || started.current) return
    started.current = true
    setError(null)
    try {
      await api.acceptInvitation(token)
      await refresh()
      setAccepted(true)
    } catch (reason) {
      started.current = false
      setError(reason instanceof ApiError && reason.status === 401
        ? 'Your session expired or this invitation is unavailable. Sign in again and retry.'
        : 'The invitation could not be accepted. It may be expired, revoked, for another account, or already unavailable. Retry to confirm its status.')
    }
  }

  useEffect(() => {
    // Fragments are not sent to Next.js, API servers, or Referer headers. Copy the
    // one-time value into component memory, then immediately remove it from history.
    if (consumedFragment.current === undefined) {
      consumedFragment.current = invitationTokenFromFragment(window.location.hash)
    }
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setToken(consumedFragment.current)
    setTokenReady(true)
  }, [])

  useEffect(() => {
    if (!tokenReady || state !== 'authenticated' || !token || accepted || error) return
    const timeout = window.setTimeout(() => { void accept() }, 0)
    return () => window.clearTimeout(timeout)
    // accept intentionally reads the current token and session state for this mounted invitation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenReady, state, token, accepted, error])

  const checkSession = async () => {
    setChecking(true)
    try { await refresh() } catch { /* The view below communicates the unavailable session state. */ }
    finally { setChecking(false) }
  }

  if (!tokenReady || state === 'loading') return <main className='grid min-h-[70vh] place-items-center p-6' aria-live='polite'><div className='flex items-center gap-3 text-sm text-muted-foreground'><LoaderCircle className='size-5 animate-spin' aria-hidden='true' />Preparing invitation…</div></main>
  if (!token && !accepted) return <StatusPage title='Invitation link is incomplete' detail='Open the original invitation link provided to you and try again.' action={<Button nativeButton={false} render={<Link href='/' />}>Return home</Button>} />
  if (state === 'authenticated' && !accepted && !error) {
    return <main className='grid min-h-[70vh] place-items-center p-6' aria-live='polite'><div className='flex items-center gap-3 text-sm text-muted-foreground'><LoaderCircle className='size-5 animate-spin' aria-hidden='true' />Accepting invitation…</div></main>
  }
  if (accepted) return <StatusPage title='Invitation accepted' detail='The API confirmed your membership. Your active workspaces are being refreshed.' action={<Button onClick={() => router.replace('/workspaces')}>Continue to workspaces</Button>} />
  if (state === 'unauthenticated') return <main className='mx-auto grid min-h-[85vh] w-full max-w-xl place-items-center px-4 py-12'><section className='w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8'>
    <MailCheck className='mb-5 size-7 text-primary' aria-hidden='true' /><h1 className='text-2xl font-semibold'>Sign in to accept your invitation</h1>
    <p className='mt-2 text-sm text-muted-foreground'>This invitation is linked to an existing JurisMind account. Keep this page open, sign in in a new tab, then return here to continue. The one-time invitation token is removed from the address bar as soon as this page opens and is held only in page memory.</p>
    <div className='mt-6 flex flex-col gap-3 sm:flex-row'><Button nativeButton={false} render={<Link href='/pages/auth/login' target='_blank' rel='noreferrer' />}>Open sign in in a new tab</Button><Button variant='outline' disabled={checking} onClick={() => void checkSession()}>{checking ? 'Checking…' : 'I have signed in'}</Button></div>
    {error && <p role='alert' className='mt-4 text-sm text-destructive'>{error}</p>}
  </section></main>
  if (state === 'error') return <StatusPage title='Could not verify your session' detail='The invitation was not submitted. Check your connection, then retry.' action={<Button onClick={() => void checkSession()}>Retry session check</Button>} />

  return <StatusPage title='Invitation not accepted' detail={error ?? 'The invitation could not be confirmed.'} action={<div className='flex flex-wrap gap-3'><Button onClick={() => { started.current = false; setError(null); void accept() }}>Retry invitation</Button><Button variant='outline' onClick={() => void checkSession()}>Check session</Button></div>} />
}

export default function InvitationAcceptance() {
  return <AuthProvider><AcceptanceFlow /></AuthProvider>
}

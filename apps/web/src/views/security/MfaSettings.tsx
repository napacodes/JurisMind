'use client'

import { Suspense, useEffect, useState } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGate } from '@/components/auth/AuthGate'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function MfaSettings() {
  return <AuthProvider><Suspense fallback={<main className='grid min-h-[65vh] place-items-center p-6'>Loading security settings…</main>}><AuthGate><MfaPanel /></AuthGate></Suspense></AuthProvider>
}

function MfaPanel() {
  const [enabled, setEnabled] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [recovery, setRecovery] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const refresh = async () => { const status = await api.mfaStatus(); setEnabled(status.enabled); setRemaining(status.recoveryCodesRemaining) }
  useEffect(() => {
    let mounted = true
    void api.mfaStatus().then((status) => {
      if (mounted) { setEnabled(status.enabled); setRemaining(status.recoveryCodesRemaining) }
    }).catch(() => { if (mounted) setNotice('Security settings could not be loaded.') })
    return () => { mounted = false }
  }, [])
  async function start(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setNotice(''); try { const result = await api.mfaEnrollment(password); setSecret(result.secret); setUri(result.otpauthUrl); setPassword('') } catch { setNotice('Setup could not be started. Verify your password and try again.') } }
  async function confirm(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { const result = await api.mfaConfirmEnrollment(code); setRecovery(result.recoveryCodes); setSecret(''); setUri(''); setCode(''); await refresh() } catch { setNotice('That authenticator code is invalid or setup expired.') } }
  async function regenerate(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { const result = await api.mfaRegenerateRecoveryCodes(password, code); setRecovery(result.recoveryCodes); setPassword(''); setCode(''); await refresh() } catch { setNotice('Reauthentication failed. Check your password and authenticator code.') } }
  async function disable(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { await api.mfaDisable(password, code); setPassword(''); setCode(''); setRecovery([]); setNotice('Two-factor authentication is disabled.'); await refresh() } catch { setNotice('Reauthentication failed. Check your password and authenticator code.') } }
  return <main className='mx-auto max-w-2xl space-y-6 px-4 py-10'>
    <div><h1 className='text-2xl font-semibold'>Two-factor authentication</h1><p className='mt-2 text-sm text-muted-foreground'>Authenticator-based verification adds a second step at sign-in.</p></div>
    <section className='space-y-4 rounded-xl border bg-card p-5'>
      <h2 className='font-semibold'>{enabled ? 'Enabled' : 'Not enabled'}</h2>
      {enabled ? <p className='text-sm text-muted-foreground'>{remaining} unused recovery codes remain.</p> : null}
      {!enabled && !secret && <form onSubmit={start} className='space-y-3'><label htmlFor='mfa-password' className='block text-sm'>Confirm your password</label><Input id='mfa-password' type='password' autoComplete='current-password' value={password} onChange={(e) => setPassword(e.target.value)} required /><Button type='submit'>Set up authenticator</Button></form>}
      {secret && <><p className='text-sm'>Add this key to your authenticator app, then confirm the generated code.</p><code className='block break-all rounded bg-muted p-3'>{secret}</code><a className='break-all text-sm underline' href={uri}>Open authenticator app</a><form onSubmit={confirm} className='space-y-3'><label htmlFor='enroll-code' className='block text-sm'>6-digit code</label><Input id='enroll-code' inputMode='numeric' autoComplete='one-time-code' maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required /><Button type='submit'>Confirm and enable</Button></form></>}
      {enabled && <><form onSubmit={regenerate} className='space-y-3 border-t pt-4'><h3 className='font-medium'>Replace recovery codes</h3><Input aria-label='Current password' type='password' placeholder='Current password' value={password} onChange={(e) => setPassword(e.target.value)} required /><Input aria-label='Authenticator code' inputMode='numeric' placeholder='Authenticator code' value={code} onChange={(e) => setCode(e.target.value)} required /><Button type='submit' variant='outline'>Generate new recovery codes</Button></form><form onSubmit={disable} className='space-y-3 border-t pt-4'><h3 className='font-medium'>Disable two-factor authentication</h3><Input aria-label='Current password' type='password' placeholder='Current password' value={password} onChange={(e) => setPassword(e.target.value)} required /><Input aria-label='Authenticator code' inputMode='numeric' placeholder='Authenticator code' value={code} onChange={(e) => setCode(e.target.value)} required /><Button type='submit' variant='destructive'>Disable</Button></form></>}
    </section>
    {recovery.length > 0 && <section className='space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5' aria-live='polite'><h2 className='font-semibold'>Save your recovery codes</h2><p className='text-sm'>Each code works once. They are shown only now; store them securely.</p><ul className='grid grid-cols-2 gap-2 font-mono text-sm'>{recovery.map((item) => <li key={item}>{item}</li>)}</ul><Button variant='outline' onClick={() => { void navigator.clipboard.writeText(recovery.join('\n')) }}>Copy codes</Button><Button variant='ghost' onClick={() => setRecovery([])}>Done</Button></section>}
    {notice && <p role='status' className='text-sm'>{notice}</p>}
  </main>
}

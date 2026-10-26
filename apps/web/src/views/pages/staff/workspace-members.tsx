'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ApiError, api } from '@/lib/api'
import type { PracticeRole, WorkspaceAccount } from '@/lib/api'
import { useAuth } from '@/components/auth/AuthProvider'
import { StatusPage } from '@/components/auth/AuthGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function WorkspaceMembers() {
  const { workspaces } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('workspaceId')
  const firmAdminWorkspaces = useMemo(() => workspaces.filter((workspace) => workspace.kind === 'FIRM'
    && workspace.role === 'FIRM_ADMIN' && workspace.permissions.includes('workspace:read:memberships')), [workspaces])
  const workspace = requestedId === null
    ? firmAdminWorkspaces[0]
    : firmAdminWorkspaces.find((candidate) => candidate.id === requestedId)
  const [members, setMembers] = useState<WorkspaceAccount[]>([])
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<PracticeRole>('LAWYER')
  const [supervisorId, setSupervisorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [localInviteHref, setLocalInviteHref] = useState<string | null>(null)

  useEffect(() => {
    if (requestedId === null && firmAdminWorkspaces[0]) {
      router.replace(`/staff?workspaceId=${encodeURIComponent(firmAdminWorkspaces[0].id)}`)
    }
  }, [requestedId, firmAdminWorkspaces, router])

  const workspaceId = workspace?.id
  useEffect(() => {
    if (!workspaceId) return
    let active = true
    void api.workspaceMembers(workspaceId).then((result) => {
      if (active) { setMembers(result); setError(null); setLoadedWorkspaceId(workspaceId) }
    }).catch((reason: unknown) => {
      if (active) { setError(reason instanceof Error ? reason.message : 'Firm members could not be loaded.'); setLoadedWorkspaceId(workspaceId) }
    })
    return () => { active = false }
  }, [workspaceId])

  const activeLawyers = members.filter((member) => member.role === 'LAWYER'
    && member.status === 'ACTIVE' && member.user.status === 'ACTIVE' && member.lawyerProfile)
  const loading = Boolean(workspaceId && loadedWorkspaceId !== workspaceId)

  if (!workspace) return <StatusPage title='Firm membership management is restricted'
    detail='Choose an active firm workspace where your account has the Firm Admin membership permission. Platform administration does not grant firm membership access.' />

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace) return
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      const result = await api.inviteWorkspaceMember(workspace.id, {
        email: email.trim(), role,
        ...(role === 'ASSISTANT' ? { supervisorMembershipId: supervisorId } : {}),
      })
      setEmail('')
      setLocalInviteHref(result.developmentToken
        ? `/invitations/accept#token=${encodeURIComponent(result.developmentToken)}`
        : null)
      setNotice(result.delivery === 'not_configured'
        ? 'The invitation is pending, but email delivery is not configured. Configure an invitation delivery provider before relying on email delivery.'
        : 'Invitation created. The recipient must sign in to the invited account to accept it.')
      setMembers(await api.workspaceMembers(workspace.id))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : reason instanceof Error ? reason.message : 'Invitation could not be created.')
    } finally { setSaving(false) }
  }

  async function suspend(membershipId: string) {
    if (!workspace) return
    setError(null)
    try {
      await api.suspendWorkspaceMember(workspace.id, membershipId)
      setMembers(await api.workspaceMembers(workspace.id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Membership could not be suspended.')
    }
  }

  return <div className='mx-auto w-full max-w-5xl space-y-8'>
    <header className='space-y-2'>
      <p className='text-sm font-medium text-primary'>Firm administration</p>
      <h1 className='text-3xl font-semibold tracking-tight'>People and access</h1>
      <p className='text-sm text-muted-foreground'>Manage memberships for {workspace.name}. API permissions and workspace membership are checked on every operation.</p>
    </header>

    <section className='rounded-xl border bg-card p-5 sm:p-6' aria-labelledby='invite-title'>
      <h2 id='invite-title' className='text-lg font-semibold'>Invite an existing account</h2>
      <p className='mt-1 text-sm text-muted-foreground'>The recipient must already have an active JurisMind account. Public Assistant registration is not available.</p>
      <form onSubmit={(event) => void invite(event)} className='mt-5 grid gap-4 sm:grid-cols-2' noValidate>
        <label className='space-y-2 text-sm font-medium'>Account email
          <Input type='email' autoComplete='email' maxLength={320} required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className='space-y-2 text-sm font-medium'>Firm role
          <select className='h-9 w-full rounded-md border bg-background px-3 text-sm' value={role}
            onChange={(event) => setRole(event.target.value as PracticeRole)}>
            <option value='FIRM_ADMIN'>Firm Admin</option><option value='LAWYER'>Lawyer</option><option value='ASSISTANT'>Assistant</option>
          </select>
        </label>
        {role === 'ASSISTANT' && <label className='space-y-2 text-sm font-medium sm:col-span-2'>Supervising lawyer
          <select className='h-9 w-full rounded-md border bg-background px-3 text-sm' required value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}>
            <option value=''>Choose an active firm lawyer</option>
            {activeLawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.user.fullName} · {lawyer.user.email}</option>)}
          </select>
        </label>}
        {error && <p role='alert' className='text-sm text-destructive sm:col-span-2'>{error}</p>}
        {notice && <p role='status' className='text-sm text-muted-foreground sm:col-span-2'>{notice}</p>}
        {localInviteHref && <p className='text-sm text-muted-foreground sm:col-span-2'>Development delivery is enabled. Share this one-time link with the invited account: <Link className='underline' href={localInviteHref}>Open invitation link</Link></p>}
        <div><Button type='submit' disabled={saving || (role === 'ASSISTANT' && (!supervisorId || activeLawyers.length === 0))}>
          {saving ? 'Creating invitation…' : 'Create invitation'}
        </Button></div>
      </form>
    </section>

    <section className='rounded-xl border bg-card' aria-labelledby='members-title'>
      <div className='border-b p-5 sm:p-6'><h2 id='members-title' className='text-lg font-semibold'>Workspace members</h2>
        <p className='mt-1 text-sm text-muted-foreground'>Membership and account state are shown separately.</p></div>
      {loading ? <p className='p-6 text-sm text-muted-foreground' aria-live='polite'>Loading firm members…</p>
        : error && members.length === 0 ? <p role='alert' className='p-6 text-sm text-destructive'>{error}</p>
          : <div className='divide-y'>{members.map((member) => <article key={member.id} className='flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between'>
            <div><p className='font-medium'>{member.user.fullName}</p><p className='text-sm text-muted-foreground'>{member.user.email}</p>
              <p className='mt-1 text-xs text-muted-foreground'>{member.role.replace('_', ' ')} · Membership {member.status.toLowerCase()} · Account {member.user.status.toLowerCase()}
                {member.supervisor ? ` · Supervised by ${member.supervisor.user.fullName}` : ''}</p></div>
            {member.status === 'ACTIVE' && member.user.status === 'ACTIVE' && <Button variant='outline' size='sm' onClick={() => void suspend(member.id)}>Suspend membership</Button>}
          </article>)}{members.length === 0 && !loading && <p className='p-6 text-sm text-muted-foreground'>No firm memberships were found.</p>}</div>}
    </section>
  </div>
}

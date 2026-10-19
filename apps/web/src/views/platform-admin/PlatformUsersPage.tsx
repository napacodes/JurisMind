'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import type { PlatformUserDetail, PlatformUserPage, PlatformUserSummary } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/components/auth/AuthProvider'
import { platformUserListState, platformUserMutationNotice, platformUserStatusAction } from './platform-user-ui-state'

type Filters = { search: string; role: string; status: string; workspaceKind: string }
const initialFilters: Filters = { search: '', role: '', status: '', workspaceKind: '' }

function showError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return 'Your account is not authorized to manage platform users.'
  if (error instanceof ApiError && error.status === 401) return 'Your session expired. Sign in again to continue.'
  if (error instanceof ApiError && error.status === 409) return 'The change conflicts with current account state or an administrator safeguard. You cannot disable your own account or the last viable Super Admin.'
  if (error instanceof ApiError && error.status === 400) return 'Some filters or account details were invalid. Review the form and try again.'
  return 'The request could not be completed. Try again.'
}

function dateLabel(value: string | null) {
  if (!value) return 'Not verified'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function roleLabels(user: PlatformUserSummary) {
  return [...user.platformRoles, ...user.practiceMemberships.map((membership) => membership.role)]
}

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PlatformUserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const [detail, setDetail] = useState<PlatformUserDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [pending, setPending] = useState<{ user: PlatformUserSummary; status: 'ACTIVE' | 'DISABLED' } | null>(null)
  const [mutating, setMutating] = useState(false)
  const listState = platformUserListState(loading, Boolean(error && !result), result?.users.length ?? 0)

  const getUsers = useCallback(() => api.platformUsers({
    page, pageSize: 25,
    ...(applied.search ? { search: applied.search } : {}),
    ...(applied.role ? { role: applied.role } : {}),
    ...(applied.status ? { status: applied.status } : {}),
    ...(applied.workspaceKind ? { workspaceKind: applied.workspaceKind } : {}),
  }), [page, applied])

  useEffect(() => {
    let active = true
    void getUsers().then((next) => {
      if (!active) return
      setResult(next)
      setError('')
    }).catch((reason: unknown) => {
      if (!active) return
      setResult(null)
      setError(showError(reason))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getUsers, refreshCount])

  async function openDetails(user: PlatformUserSummary) {
    setDetail(null)
    setDetailOpen(true)
    try { setDetail(await api.platformUser(user.id)) }
    catch (reason) { setError(showError(reason)); setDetailOpen(false) }
  }

  async function confirmStatusChange() {
    if (!pending) return
    setMutating(true)
    setError('')
    setNotice('')
    try {
      const result = await api.changePlatformUserStatus(pending.user.id, pending.status)
      setNotice(platformUserMutationNotice(result.status, result.changed))
      setPending(null)
      setLoading(true)
      setRefreshCount((count) => count + 1)
    } catch (reason) {
      setError(showError(reason))
      setPending(null)
    } finally { setMutating(false) }
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setApplied({ ...filters, search: filters.search.trim() })
    setLoading(true)
    setError('')
    setNotice('')
  }

  return <div className='space-y-6'>
    <header className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
      <div>
        <p className='text-sm font-medium text-primary'>Platform administration</p>
        <h1 className='mt-1 text-3xl font-semibold tracking-tight'>Users</h1>
        <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>Search platform accounts and review practice memberships. Platform access does not grant access to confidential matters.</p>
      </div>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'><ShieldCheck className='size-4' aria-hidden='true' />Super Admin access</div>
    </header>

    {error && <p role='alert' className='rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive'>{error}</p>}
    {notice && <p role='status' className='rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm'>{notice}</p>}

    <Card>
      <CardHeader><CardTitle>Find users</CardTitle><CardDescription>Search by name or email; filters include current roles, account status, and active workspace type.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submitFilters} className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(9rem,1fr))_auto]'>
          <label className='relative block'><span className='sr-only'>Search by name or email</span><Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' /><Input className='pl-9' value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} maxLength={100} placeholder='Name or email' /></label>
          <label className='space-y-1 text-xs text-muted-foreground'><span>Role</span><select aria-label='Filter by role' value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} className='h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground'><option value=''>All roles</option><option value='SUPER_ADMIN'>Super Admin</option><option value='FIRM_ADMIN'>Firm Admin</option><option value='LAWYER'>Lawyer</option><option value='ASSISTANT'>Assistant</option></select></label>
          <label className='space-y-1 text-xs text-muted-foreground'><span>Account status</span><select aria-label='Filter by account status' value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className='h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground'><option value=''>All statuses</option><option value='ACTIVE'>Active</option><option value='DISABLED'>Disabled</option></select></label>
          <label className='space-y-1 text-xs text-muted-foreground'><span>Workspace type</span><select aria-label='Filter by workspace type' value={filters.workspaceKind} onChange={(event) => setFilters({ ...filters, workspaceKind: event.target.value })} className='h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground'><option value=''>All types</option><option value='FIRM'>Firm</option><option value='INDIVIDUAL'>Individual practice</option></select></label>
          <Button type='submit' className='self-end'>Apply filters</Button>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
        <div><CardTitle className='flex items-center gap-2'><UsersRound className='size-5' aria-hidden='true' />Platform accounts</CardTitle><CardDescription>{result ? `${result.pagination.total} account${result.pagination.total === 1 ? '' : 's'}` : 'User directory'}</CardDescription></div>
        {result && result.pagination.total > 0 && <span className='text-sm text-muted-foreground'>Page {result.pagination.page} of {Math.max(result.pagination.totalPages, 1)}</span>}
      </CardHeader>
      <CardContent className='space-y-4'>
        {listState === 'loading' ? <div className='py-10 text-center text-sm text-muted-foreground' role='status'>Loading platform users…</div>
          : listState === 'error' ? <div className='py-8 text-center'><p className='text-sm text-muted-foreground'>The user list could not be loaded.</p><Button className='mt-3' variant='outline' onClick={() => { setLoading(true); setRefreshCount((count) => count + 1) }}>Try again</Button></div>
            : listState === 'empty' ? <div className='py-10 text-center'><UserRound className='mx-auto size-8 text-muted-foreground' aria-hidden='true' /><p className='mt-3 font-medium'>No users found</p><p className='mt-1 text-sm text-muted-foreground'>Try a different search or filter.</p></div>
              : result ? <>
                <Table>
                  <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Account</TableHead><TableHead>Roles</TableHead><TableHead>Workspaces</TableHead><TableHead>Created</TableHead><TableHead><span className='sr-only'>Actions</span></TableHead></TableRow></TableHeader>
                  <TableBody>{result.users.map((user) => <TableRow key={user.id}>
                    <TableCell className='whitespace-normal'><p className='font-medium'>{user.fullName}</p><p className='text-xs text-muted-foreground'>{user.email}</p></TableCell>
                    <TableCell><Badge variant={user.status === 'ACTIVE' ? 'secondary' : 'outline'}>{user.status === 'ACTIVE' ? 'Active' : 'Disabled'}</Badge></TableCell>
                    <TableCell className='whitespace-normal'><div className='flex max-w-64 flex-wrap gap-1'>{roleLabels(user).length ? roleLabels(user).map((role, index) => <Badge key={`${role}-${index}`} variant='outline'>{role.replaceAll('_', ' ')}</Badge>) : <span className='text-xs text-muted-foreground'>No active roles</span>}</div></TableCell>
                    <TableCell className='whitespace-normal'>{user.practiceMemberships.length ? user.practiceMemberships.map((membership) => <p key={membership.workspace.id} className='text-sm'>{membership.workspace.name}<span className='ml-1 text-xs text-muted-foreground'>({membership.workspace.kind === 'FIRM' ? 'Firm' : 'Individual'})</span></p>) : <span className='text-sm text-muted-foreground'>None</span>}</TableCell>
                    <TableCell>{dateLabel(user.createdAt)}</TableCell>
                    <TableCell><div className='flex justify-end gap-2'><Button size='sm' variant='outline' onClick={() => void openDetails(user)}>Details</Button>{(() => { const action = platformUserStatusAction(user.status, currentUser?.id === user.id); return <Button size='sm' disabled={action.disabled} title={action.reason} variant={user.status === 'ACTIVE' ? 'destructive' : 'default'} onClick={() => setPending({ user, status: action.nextStatus })}>{action.label}</Button> })()}</div></TableCell>
                  </TableRow>)}</TableBody>
                </Table>
                <Separator />
                <div className='flex items-center justify-between gap-3'><p className='text-xs text-muted-foreground'>Showing {result.users.length} of {result.pagination.total}</p><div className='flex gap-2'><Button variant='outline' size='sm' disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1) }}>Previous</Button><Button variant='outline' size='sm' disabled={page >= result.pagination.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1) }}>Next</Button></div></div>
              </> : null}
      </CardContent>
    </Card>

    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader><DialogTitle>User details</DialogTitle><DialogDescription>Administrative identity and membership information only.</DialogDescription></DialogHeader>
        {!detail ? <p role='status' className='py-6 text-sm text-muted-foreground'>Loading user details…</p> : <div className='space-y-4 text-sm'>
          <div><p className='font-semibold'>{detail.fullName}</p><p className='text-muted-foreground'>{detail.email}</p><p className='mt-2'>Account: {detail.status} · Email: {dateLabel(detail.emailVerifiedAt)}</p><p>Created: {dateLabel(detail.createdAt)} · Updated: {dateLabel(detail.updatedAt)}</p></div>
          <Separator />
          <section><h3 className='font-semibold'>Platform roles</h3><p className='mt-1 text-muted-foreground'>{detail.platformRoles.length ? detail.platformRoles.join(', ') : 'None'}</p></section>
          <section><h3 className='font-semibold'>Practice memberships</h3>{detail.memberships.length ? <ul className='mt-2 space-y-2'>{detail.memberships.map((membership) => <li key={membership.id} className='rounded-md border p-3'><p className='font-medium'>{membership.workspace.name}</p><p className='text-muted-foreground'>{membership.workspace.kind === 'FIRM' ? 'Firm' : 'Individual practice'} · {membership.role.replaceAll('_', ' ')} · {membership.status}</p></li>)}</ul> : <p className='mt-1 text-muted-foreground'>No practice memberships.</p>}</section>
        </div>}
        <DialogFooter><Button variant='outline' onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open && !mutating) setPending(null) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{pending?.status === 'DISABLED' ? 'Suspend this account?' : 'Activate this account?'}</DialogTitle><DialogDescription>
          {pending?.status === 'DISABLED'
            ? `This disables ${pending.user.email} and revokes their active sessions. Membership records remain intact; activation will not restore revoked sessions.`
            : `This reactivates ${pending?.user.email}. The user will need to sign in again; prior sessions remain revoked.`}
        </DialogDescription></DialogHeader>
        <DialogFooter><Button variant='outline' disabled={mutating} onClick={() => setPending(null)}>Cancel</Button><Button variant={pending?.status === 'DISABLED' ? 'destructive' : 'default'} disabled={mutating} onClick={() => void confirmStatusChange()}>{mutating ? 'Saving…' : pending?.status === 'DISABLED' ? 'Suspend account' : 'Activate account'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

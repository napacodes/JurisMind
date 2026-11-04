'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BriefcaseBusiness, Check, ChevronDown, Clock3, FileCheck2, Mail, Search, ShieldAlert, UserPlus, UsersRound } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import type { PlatformUserDetail, PracticeUserPage } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/AuthProvider'
import { PracticeUserCreateDialog } from './PracticeUserCreateDialog'

type Filters = { search: string; role: string; status: string; kycStatus: string; emailStatus: string }
const initialFilters: Filters = { search: '', role: '', status: '', kycStatus: '', emailStatus: '' }

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })
function relativeDate(value: string | null) {
  if (!value) return 'Never logged in'
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`
}
function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'Your account is not authorized to view practice accounts.'
  if (error instanceof ApiError && error.status === 401) return 'Your session expired. Sign in again to continue.'
  return 'The user list could not be loaded. Please try again.'
}
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') }
function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '••••••'
  return `${local[0]}${'•'.repeat(Math.min(Math.max(local.length - 1, 3), 8))}@${domain}`
}
function badgeTone(value: string) {
  if (value === 'ACTIVE' || value === 'APPROVED' || value === 'VERIFIED') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
  if (value === 'PENDING') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
  if (value === 'DISABLED' || value === 'REJECTED' || value === 'EXPIRED') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
  return 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-600 dark:text-muted-foreground'
}
function kycLabel(status: string) {
  if (status === 'APPROVED') return 'Verified'
  if (status === 'PENDING') return 'Pending review'
  if (status === 'CHANGES_REQUESTED') return 'Changes requested'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'EXPIRED') return 'Expired'
  return 'Not submitted'
}

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PracticeUserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<PlatformUserDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchUsers = useCallback(() => api.practiceUsers({ page, pageSize: 10,
    ...(applied.search ? { search: applied.search } : {}), ...(applied.role ? { role: applied.role } : {}),
    ...(applied.status ? { status: applied.status } : {}), ...(applied.kycStatus ? { kycStatus: applied.kycStatus } : {}),
    ...(applied.emailStatus ? { emailStatus: applied.emailStatus } : {}),
  }), [page, applied])

  useEffect(() => {
    let live = true
    void fetchUsers().then((data) => { if (live) { setResult(data); setError('') } })
      .catch((cause: unknown) => { if (live) { setResult(null); setError(errorText(cause)) } })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [fetchUsers, refresh])

  async function manage(id: string) {
    setDetail(null); setDetailOpen(true)
    try { setDetail(await api.platformUser(id)) }
    catch (cause) { setDetailOpen(false); setError(errorText(cause)) }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setPage(1); setApplied({ ...filters, search: filters.search.trim() })
  }
  function reset() { setLoading(true); setFilters(initialFilters); setApplied(initialFilters); setPage(1) }

  const stats = result?.statistics
  const weeklyDelta = stats ? stats.createdThisWeek - stats.createdPreviousWeek : 0
  const dailyMaximum = Math.max(1, ...(stats?.dailyJoins ?? [1]))
  const activityMaximum = Math.max(1, ...(stats?.dailyActivity ?? [1]))
  const pages = Math.max(result?.pagination.totalPages ?? 0, 1)
  const pageNumbers = Array.from(new Set([1, Math.max(1, page - 1), page, Math.min(pages, page + 1), pages])).sort((a, b) => a - b)

  return <div className='min-h-full space-y-5 bg-slate-50/70 dark:bg-background pb-8'>
    <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground'><span>Customers</span><span>/</span><span>User accounts</span><span>/</span><span className='font-medium text-slate-800 dark:text-foreground'>All users</span></div>
    <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-start gap-3'>
        <span className='mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'><UsersRound className='size-5' aria-hidden='true' /></span>
        <div><p className='text-[10px] font-bold tracking-[.18em] text-violet-600 dark:text-violet-300'>PEOPLE</p><div className='mt-0.5 flex flex-wrap items-center gap-2'><h1 className='text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground'>User Management</h1>{result && <Badge variant='outline' className='rounded-full border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'>{result.pagination.total.toLocaleString()} accounts</Badge>}</div><p className='mt-1 text-sm text-slate-500 dark:text-muted-foreground'>Customer records, balances, activity logs and login access.</p></div>
      </div>
      <Button onClick={() => setCreateOpen(true)} className='bg-violet-600 text-white hover:bg-violet-700'><UserPlus className='mr-2 size-4' />Add User</Button>
    </header>

    {error && <div role='alert' className='flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300'><span>{error}</span><Button size='sm' variant='outline' onClick={() => { setLoading(true); setRefresh((value) => value + 1) }}>Retry</Button></div>}

    <section aria-label='Account statistics' className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      <Card className='rounded-xl border-slate-200 dark:border-border shadow-sm'><CardContent className='p-4'><div className='flex items-start justify-between'><p className='text-xs font-medium text-slate-500 dark:text-muted-foreground'>Total Users</p><span className='rounded-lg bg-violet-50 dark:bg-violet-500/10 p-2 text-violet-600 dark:text-violet-300'><UsersRound className='size-4' /></span></div><p className='mt-3 text-2xl font-semibold text-slate-900 dark:text-foreground'>{stats?.total.toLocaleString() ?? '—'}</p><div className='mt-2 flex items-center justify-between'><span className={`flex items-center gap-1 text-xs ${weeklyDelta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{weeklyDelta >= 0 ? <ArrowUp className='size-3' /> : <ArrowDown className='size-3' />}{Math.abs(weeklyDelta)} this week</span><div className='flex h-7 items-end gap-1' aria-label='Daily account registrations'>{(stats?.dailyJoins ?? []).map((count, index) => <span key={index} className='w-1.5 rounded-sm bg-violet-300 dark:bg-violet-400/70' style={{ height: `${Math.max(5, (count / dailyMaximum) * 25)}px` }} />)}</div></div></CardContent></Card>
      <Card className='rounded-xl border-slate-200 dark:border-border shadow-sm'><CardContent className='p-4'><div className='flex items-start justify-between'><p className='text-xs font-medium text-slate-500 dark:text-muted-foreground'>Active Today</p><span className='rounded-lg bg-sky-50 dark:bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300'><Activity className='size-4' /></span></div><p className='mt-3 text-2xl font-semibold text-slate-900 dark:text-foreground'>{stats?.activeToday.toLocaleString() ?? '—'}</p><div className='mt-2 flex items-center justify-between'><span className='flex items-center gap-1 text-xs text-slate-500 dark:text-muted-foreground'><Clock3 className='size-3' />Yesterday: {stats?.activeYesterday ?? '—'}</span><div className='flex h-7 items-end gap-1' aria-label='Daily active accounts'>{(stats?.dailyActivity ?? []).map((count, index) => <span key={index} className='w-1.5 rounded-sm bg-sky-300' style={{ height: `${Math.max(5, (count / activityMaximum) * 25)}px` }} />)}</div></div></CardContent></Card>
      <Card className='rounded-xl border-slate-200 dark:border-border shadow-sm'><CardContent className='p-4'><div className='flex items-start justify-between'><p className='text-xs font-medium text-slate-500 dark:text-muted-foreground'>KYC Pending</p><span className='rounded-lg bg-amber-50 dark:bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300'><FileCheck2 className='size-4' /></span></div><p className='mt-3 text-2xl font-semibold text-slate-900 dark:text-foreground'>{stats?.kycPending.toLocaleString() ?? '—'}</p><p className='mt-2 text-xs text-slate-500 dark:text-muted-foreground'>Accounts awaiting KYC review</p></CardContent></Card>
      <Card className='rounded-xl border-slate-200 dark:border-border shadow-sm'><CardContent className='p-4'><div className='flex items-start justify-between'><p className='text-xs font-medium text-slate-500 dark:text-muted-foreground'>Suspended</p><span className='rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2 text-rose-600 dark:text-rose-300'><ShieldAlert className='size-4' /></span></div><p className='mt-3 text-2xl font-semibold text-slate-900 dark:text-foreground'>{stats?.suspended.toLocaleString() ?? '—'}</p><p className='mt-2 text-xs text-slate-500 dark:text-muted-foreground'>Disabled user accounts</p></CardContent></Card>
    </section>

    <Card className='rounded-xl border-slate-200 dark:border-border shadow-sm'><CardContent className='p-4'>
      <form onSubmit={submit} className='grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.6fr)_repeat(4,minmax(9rem,1fr))_auto_auto]'>
        <label className='relative'><span className='sr-only'>Search name, username, phone, or email</span><Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-400' /><Input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} maxLength={100} placeholder='Search name, username, phone, email' className='h-10 rounded-lg border-slate-200 dark:border-border pl-9' /></label>
        <SelectFilter label='Account Role' value={filters.role} onChange={(role) => setFilters({ ...filters, role })} options={ [['','All roles'],['FIRM','Firm'],['LAWYER','Lawyer'],['ASSISTANT','Assistant']] } />
        <SelectFilter label='Account Status' value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={ [['','All statuses'],['ACTIVE','Active'],['DISABLED','Suspended']] } />
        <SelectFilter label='KYC Status' value={filters.kycStatus} onChange={(kycStatus) => setFilters({ ...filters, kycStatus })} options={ [['','All KYC'],['PENDING','Pending'],['VERIFIED','Verified'],['NOT_SUBMITTED','Not submitted']] } />
        <SelectFilter label='Email Status' value={filters.emailStatus} onChange={(emailStatus) => setFilters({ ...filters, emailStatus })} options={ [['','All email'],['VERIFIED','Verified'],['UNVERIFIED','Unverified']] } />
        <Button type='submit' className='h-10 rounded-lg bg-violet-600 px-5 text-white hover:bg-violet-700'><Search className='mr-2 size-4' />Search</Button>
        <Button type='button' variant='ghost' className='h-10 text-slate-500 dark:text-muted-foreground' onClick={reset}>Clear</Button>
      </form>
    </CardContent></Card>

    <Card className='overflow-hidden rounded-xl border-slate-200 dark:border-border shadow-sm'><div className='flex items-center justify-between border-b border-slate-100 dark:border-border/70 px-4 py-3'><div className='flex items-center gap-2'><BriefcaseBusiness className='size-4 text-violet-600 dark:text-violet-300' /><h2 className='text-sm font-semibold text-slate-900 dark:text-foreground'>All practice accounts</h2></div><p className='text-xs text-slate-500 dark:text-muted-foreground'>{result ? `Showing ${result.users.length} of ${result.pagination.total}` : 'Practice directory'}</p></div>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[980px] border-collapse text-left text-sm'>
          <thead className='bg-slate-50/80 dark:bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground'><tr><th className='px-4 py-3'>Member</th><th className='px-4 py-3'>Contact</th><th className='px-4 py-3'>Verification</th><th className='px-4 py-3'>Joined</th><th className='px-4 py-3'>Last Login</th><th className='px-4 py-3 text-right'>Action</th></tr></thead>
          <tbody className='divide-y divide-slate-100 dark:divide-border/70'>
            {loading ? <tr><td colSpan={6} className='h-36 text-center text-sm text-slate-500 dark:text-muted-foreground'>Loading practice accounts…</td></tr>
              : error && !result ? <tr><td colSpan={6} className='h-28 text-center text-sm text-slate-500 dark:text-muted-foreground'>Account list is unavailable.</td></tr>
                : !result?.users.length ? <tr><td colSpan={6} className='h-36 text-center'><UsersRound className='mx-auto size-6 text-slate-300 dark:text-slate-500' /><p className='mt-2 text-sm font-medium text-slate-700 dark:text-slate-200'>No users found</p><p className='mt-1 text-xs text-slate-500 dark:text-muted-foreground'>Adjust or clear your filters to see more accounts.</p></td></tr>
                  : result.users.map((user) => <tr key={user.id} className='transition-colors hover:bg-violet-50/30 dark:hover:bg-violet-500/10'>
                    <td className='whitespace-nowrap px-4 py-3'><div className='flex items-center gap-3'><ProfileAvatar userId={user.id} name={user.fullName} hasPhoto={user.hasProfilePhoto} /><div><p className='font-medium text-slate-900 dark:text-foreground'>{user.fullName}</p>{user.username && <p className='text-[11px] text-slate-500 dark:text-muted-foreground'>@{user.username}</p>}<div className='mt-1 flex items-center gap-1.5'><span className='text-xs text-slate-500 dark:text-muted-foreground'>{user.workspaceName}</span><Badge variant='outline' className='h-5 border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-500/10 px-1.5 text-[10px] text-violet-700 dark:text-violet-300'>{user.role === 'FIRM' ? 'Firm' : user.role === 'LAWYER' ? 'Lawyer' : 'Assistant'}</Badge></div></div></div></td>
                    <td className='whitespace-nowrap px-4 py-3'><p className='flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200'><Mail className='size-3 text-slate-400 dark:text-slate-400' />{maskEmail(user.email)}</p><div className='mt-1 flex items-center gap-1 text-[11px]'><span className={`size-1.5 rounded-full ${user.emailVerifiedAt ? 'bg-emerald-500' : 'bg-amber-400'}`} />{user.emailVerifiedAt ? 'Email verified' : 'Email unverified'}</div></td>
                    <td className='whitespace-nowrap px-4 py-3'><div className='flex flex-col items-start gap-1'><Badge variant='outline' className={`h-5 px-1.5 text-[10px] ${badgeTone(user.kycStatus)}`}>{kycLabel(user.kycStatus)}</Badge><span className='text-[10px] text-slate-500 dark:text-muted-foreground'>{user.documentStatus === 'SUBMITTED' ? 'Documents submitted' : 'No documents submitted'}</span><span className={`flex items-center gap-1 text-[10px] ${user.status === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{user.status === 'ACTIVE' ? <Check className='size-3' /> : <ShieldAlert className='size-3' />}{user.status === 'ACTIVE' ? 'Account active' : 'Suspended'}</span></div></td>
                    <td className='whitespace-nowrap px-4 py-3'><p className='text-xs text-slate-700 dark:text-slate-200'>{dateFormatter.format(new Date(user.joinedAt))}</p><p className='mt-1 text-[11px] text-slate-400 dark:text-slate-400'>{relativeDate(user.joinedAt)}</p></td>
                    <td className='whitespace-nowrap px-4 py-3'><p className='text-xs text-slate-700 dark:text-slate-200'>{user.lastLoginAt ? timeFormatter.format(new Date(user.lastLoginAt)) : '—'}</p><p className='mt-1 text-[11px] text-slate-400 dark:text-slate-400'>{relativeDate(user.lastLoginAt)}</p></td>
                    <td className='whitespace-nowrap px-4 py-3 text-right'><Button variant='outline' size='sm' onClick={() => void manage(user.id)} className='h-8 rounded-lg border-violet-200 dark:border-violet-800 px-3 text-xs text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/15 dark:bg-violet-500/10'>Manage</Button></td>
                  </tr>)}
          </tbody>
        </table>
      </div>
      <div className='flex flex-col gap-3 border-t border-slate-100 dark:border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'><p className='text-xs text-slate-500 dark:text-muted-foreground'>Page {result?.pagination.page ?? page} of {pages} · {result?.pagination.total ?? 0} accounts</p><div className='flex items-center justify-end gap-1'><Button variant='outline' size='icon' aria-label='Previous page' disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)) }} className='size-8 rounded-lg border-slate-200 dark:border-border'><ArrowLeft className='size-3.5' /></Button>{pageNumbers.map((number, index) => <span key={number} className='flex items-center gap-1'>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className='px-1 text-slate-400 dark:text-slate-400'>…</span>}<Button variant={page === number ? 'default' : 'outline'} size='sm' onClick={() => { setLoading(true); setPage(number) }} disabled={loading} aria-current={page === number ? 'page' : undefined} className={`size-8 rounded-lg p-0 text-xs ${page === number ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground'}`}>{number}</Button></span>)}<Button variant='outline' size='icon' aria-label='Next page' disabled={page >= pages || loading} onClick={() => { setLoading(true); setPage((current) => Math.min(pages, current + 1)) }} className='size-8 rounded-lg border-slate-200 dark:border-border'><ArrowRight className='size-3.5' /></Button></div></div>
    </Card>

    <p className='text-xs text-slate-400 dark:text-slate-400'>Search users by name, username, phone number, or email address.</p>

    <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'><DialogHeader><DialogTitle>Manage account</DialogTitle><DialogDescription>Practice account details and workspace memberships.</DialogDescription></DialogHeader>{!detail ? <p role='status' className='py-5 text-sm text-slate-500 dark:text-muted-foreground'>Loading account…</p> : <div className='space-y-4 text-sm'><div><p className='font-semibold text-slate-900 dark:text-foreground'>{detail.fullName}</p><p className='text-slate-500 dark:text-muted-foreground'>{detail.email}</p></div><div className='grid grid-cols-2 gap-3 rounded-lg bg-slate-50 dark:bg-muted p-3'><p><span className='text-xs text-slate-500 dark:text-muted-foreground'>Account</span><br />{detail.status}</p><p><span className='text-xs text-slate-500 dark:text-muted-foreground'>Email</span><br />{detail.emailVerifiedAt ? 'Verified' : 'Unverified'}</p><p><span className='text-xs text-slate-500 dark:text-muted-foreground'>Created</span><br />{dateFormatter.format(new Date(detail.createdAt))}</p><p><span className='text-xs text-slate-500 dark:text-muted-foreground'>Last updated</span><br />{dateFormatter.format(new Date(detail.updatedAt))}</p></div><div><p className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground'>Memberships</p>{detail.memberships.length ? <ul className='space-y-2'>{detail.memberships.map((membership) => <li key={membership.id} className='flex items-center justify-between rounded-lg border border-slate-100 dark:border-border/70 px-3 py-2'><span>{membership.workspace.name}<span className='ml-1 text-xs text-slate-400 dark:text-slate-400'>({membership.workspace.kind === 'FIRM' ? 'Firm' : 'Individual'})</span></span><Badge variant='outline' className='text-[10px]'>{membership.role.replaceAll('_', ' ')}</Badge></li>)}</ul> : <p className='text-slate-500 dark:text-muted-foreground'>No memberships.</p>}</div>{currentUser?.id === detail.id && <p className='text-xs text-slate-500 dark:text-muted-foreground'>This is your own administrator account.</p>}</div>}</DialogContent></Dialog>
    <PracticeUserCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setLoading(true); setPage(1); setRefresh((value) => value + 1) }} />
  </div>
}

function ProfileAvatar({ userId, name, hasPhoto }: { userId: string; name: string; hasPhoto: boolean }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!hasPhoto) return
    let live = true
    let objectUrl = ''
    void api.platformUserProfilePhoto(userId).then((blob) => { if (live) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) } }).catch(() => undefined)
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [userId, hasPhoto])
  return <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/15 text-xs font-semibold text-violet-700 dark:text-violet-300'>{url ? <img src={url} alt='' className='size-full object-cover' /> : initials(name)}</span>
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className='relative'><span className='sr-only'>{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className='h-10 w-full appearance-none rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-background px-3 pr-8 text-sm text-slate-700 dark:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet-500'>{options.map(([option, text]) => <option key={option} value={option} className='bg-white text-slate-900 dark:bg-background dark:text-foreground'>{text}</option>)}</select><ChevronDown className='pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-400' /></label>
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CircleCheck, RefreshCw, ShieldCheck, UserCheck, UserRoundX, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loadPlatformAdminOverview, type PlatformAdminOverviewMetrics } from './platform-admin-overview-data'

const metrics = [
  { key: 'totalAccounts', label: 'Total accounts', detail: 'All platform user accounts', icon: UsersRound, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', href: '/administration/users' },
  { key: 'activeAccounts', label: 'Active accounts', detail: 'Accounts with ACTIVE status', icon: UserCheck, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', href: '/administration/users' },
  { key: 'disabledAccounts', label: 'Disabled accounts', detail: 'Accounts with DISABLED status', icon: UserRoundX, tone: 'bg-muted text-muted-foreground', href: '/administration/users' },
  { key: 'pendingCredentialReviews', label: 'Pending reviews', detail: 'Credential submissions awaiting review', icon: ShieldCheck, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', href: '/administration/lawyer-verifications' },
] as const

function MetricCard({ item, value, loading }: { item: (typeof metrics)[number]; value: number | undefined; loading: boolean }) {
  const Icon = item.icon
  return (
    <Link href={item.href} className='group block h-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring' aria-label={loading ? `${item.label}: loading` : `${item.label}: ${value}`}>
      <Card size='sm' className='h-full rounded-lg border border-border/80 shadow-none ring-0 transition-colors group-hover:border-border group-hover:bg-muted/30'>
        <CardHeader className='flex w-full flex-row items-start justify-between gap-3 px-4 pt-4'>
          <div className='min-w-0'>
            <CardDescription className='text-[13px] font-medium'>{item.label}</CardDescription>
            {loading ? <div className='mt-3 h-8 w-20 animate-pulse rounded-sm bg-muted' role='status' aria-label={`Loading ${item.label}`} />
              : <CardTitle className='mt-2 text-[28px] leading-8 font-semibold tabular-nums'>{value?.toLocaleString()}</CardTitle>}
          </div>
          <span className={`grid size-9 shrink-0 place-items-center rounded-md ${item.tone}`}>
            <Icon className='size-[18px]' aria-hidden='true' />
          </span>
        </CardHeader>
        <CardContent className='flex items-center justify-between gap-2 px-4 pb-4 text-xs text-muted-foreground'>
          <span className='min-w-0 truncate'>{item.detail}</span>
          <ArrowRight className='size-4 shrink-0 transition-transform group-hover:translate-x-0.5' aria-hidden='true' />
        </CardContent>
      </Card>
    </Link>
  )
}

export default function PlatformAdminOverviewPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [request, setRequest] = useState<{
    key: number
    status: 'success' | 'error'
    data?: PlatformAdminOverviewMetrics
  } | null>(null)
  const loading = request?.key !== refreshKey
  const error = request?.key === refreshKey && request.status === 'error'
  const result = request?.key === refreshKey && request.status === 'success' ? request.data : null

  useEffect(() => {
    let active = true
    void loadPlatformAdminOverview()
      .then((next) => {
        if (active) setRequest({ key: refreshKey, status: 'success', data: next })
      })
      .catch(() => {
        if (active) setRequest({ key: refreshKey, status: 'error' })
      })
    return () => { active = false }
  }, [refreshKey])

  return (
    <div className='space-y-7'>
      <header className='flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold text-muted-foreground'>PLATFORM ADMINISTRATION</p>
          <h1 className='mt-1 text-2xl font-semibold sm:text-[28px]'>Overview</h1>
          <p className='mt-1.5 max-w-2xl text-sm text-muted-foreground'>Account and credential-review totals from the platform services.</p>
        </div>
        <Button variant='outline' size='sm' className='self-start sm:self-center' onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          <RefreshCw className='size-4' aria-hidden='true' />
          {loading ? 'Loading…' : 'Refresh metrics'}
        </Button>
      </header>

      {error ? (
        <Card className='rounded-lg border-destructive/40'>
          <CardContent className='flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='mt-0.5 size-5 shrink-0 text-destructive' aria-hidden='true' />
              <div>
                <p className='font-medium'>Overview data could not be loaded.</p>
                <p className='mt-1 text-sm text-muted-foreground'>No account or review totals are displayed until the protected API requests succeed.</p>
              </div>
            </div>
            <Button variant='outline' onClick={() => setRefreshKey((key) => key + 1)}>Try again</Button>
          </CardContent>
        </Card>
      ) : (
        <section aria-label='Platform metrics' aria-busy={loading} className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {metrics.map((item) => (
            <MetricCard key={item.key} item={item} value={result?.[item.key]} loading={loading} />
          ))}
        </section>
      )}

      {!error && !loading && result && (
        <section aria-labelledby='attention-title' className='space-y-2.5'>
          <div>
            <h2 id='attention-title' className='text-base font-semibold'>Needs your attention</h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>Open work reported by the credential queue.</p>
          </div>
          {result.pendingCredentialReviews > 0 ? (
            <Card size='sm' className='rounded-lg border border-amber-500/25 shadow-none ring-0'>
              <CardContent className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-start gap-3'>
                  <span className='grid size-9 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                    <ShieldCheck className='size-[18px]' aria-hidden='true' />
                  </span>
                  <div>
                    <p className='text-sm font-medium'>{result.pendingCredentialReviews.toLocaleString()} credential {result.pendingCredentialReviews === 1 ? 'submission' : 'submissions'} pending</p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>Awaiting a platform review decision.</p>
                  </div>
                </div>
                <Button size='sm' nativeButton={false} render={<Link href='/administration/lawyer-verifications' />}>
                  Review queue <ArrowRight className='size-4' aria-hidden='true' />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card size='sm' className='rounded-lg border border-emerald-500/20 shadow-none ring-0'>
              <CardContent className='flex items-center gap-3 px-4 py-3'>
                <CircleCheck className='size-4 shrink-0 text-emerald-700 dark:text-emerald-300' aria-hidden='true' />
                <p className='text-sm text-muted-foreground'>No credential submissions are currently pending review.</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  )
}
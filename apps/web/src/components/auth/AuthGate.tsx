'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthProvider'
import { allowedWorkspaceNavigation, resolveWorkspaceSelection, safeReturnTo } from '@/lib/api'

export function AuthGate({ children, requireWorkspace = false, requirePlatformAdmin = false }: { children: ReactNode; requireWorkspace?: boolean; requirePlatformAdmin?: boolean }) {
  const { state, user, workspaces, refresh } = useAuth()
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const requestedId = new URLSearchParams(search).get('workspaceId')
  const workspaceSelection = resolveWorkspaceSelection(workspaces, requestedId)

  useEffect(() => {
    if (!hydrated) return
    if (state === 'unauthenticated') {
      const returnTo = safeReturnTo(`${pathname}${search ? `?${search}` : ''}`)
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    } else if (state === 'authenticated' && requireWorkspace && workspaces.length === 0) {
      router.replace('/workspaces')
    } else if (state === 'authenticated' && requireWorkspace && workspaceSelection.invalidRequest) {
      router.replace('/workspaces')
    }
  }, [hydrated, state, requireWorkspace, workspaces.length, workspaceSelection.invalidRequest, pathname, search, router])

  // Keep the first client render identical to server HTML even if AuthProvider's
  // bootstrap request finishes before a Suspense boundary hydrates this gate.
  if (!hydrated || state === 'loading') return <LoadingState label='Verifying your JurisMind session…' />
  if (state === 'error') return <StatusPage title='JurisMind is unavailable' detail='We could not verify your session. No protected workspace content was loaded.' action={<Button onClick={() => void refresh().catch(() => undefined)}>Try again</Button>} />
  if (state === 'unauthenticated') return <LoadingState label='Taking you to sign in…' />
  if (requirePlatformAdmin && !user?.platformRoles?.includes('SUPER_ADMIN')) {
    return <StatusPage title='Platform administration is restricted' detail='This area is available only to users with an active Super Admin grant. Practice roles do not provide platform-wide access.' action={<Button nativeButton={false} render={<Link href='/workspaces' />}>Return to workspaces</Button>} />
  }
  if (requireWorkspace && workspaces.length === 0) return <LoadingState label='Opening workspace setup…' />
  if (requireWorkspace && workspaceSelection.invalidRequest) return <LoadingState label='Opening your workspace list…' />

  if (requireWorkspace) {
    const selected = workspaceSelection.workspace
    const supported = allowedWorkspaceNavigation(selected?.permissions ?? [])
    if (!supported.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return <StatusPage title='This workspace view is not available' detail='Your membership does not include a supported view for this route. Workspace membership alone does not grant access to matters or confidential records.' action={<Button nativeButton={false} render={<Link href='/dashboard' />}>Open workspace overview</Button>} />
    }
  }
  return children
}

export function LoadingState({ label }: { label: string }) {
  return <main className='grid min-h-[65vh] place-items-center p-6' aria-live='polite'><div className='flex items-center gap-3 text-sm text-muted-foreground'><LoaderCircle className='size-5 animate-spin' aria-hidden='true' /><span>{label}</span></div></main>
}

export function StatusPage({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <main className='grid min-h-[65vh] place-items-center px-4 py-12'><section className='w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm' aria-labelledby='status-title'><AlertCircle className='mb-4 size-6 text-primary' aria-hidden='true' /><h1 id='status-title' className='text-xl font-semibold'>{title}</h1><p className='mt-2 text-sm text-muted-foreground'>{detail}</p>{action && <div className='mt-6'>{action}</div>}</section></main>
}

'use client'

import { Suspense } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGate, LoadingState } from '@/components/auth/AuthGate'
import ModeToggle from '@/components/layout/ModeToggle'
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import Logo from '@/components/shared/Logo'

export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>
    <Suspense fallback={<LoadingState label='Verifying your platform session…' />}>
      <AuthGate requirePlatformAdmin>
        <div className='min-h-screen bg-background'>
          <header className='sticky top-0 z-40 border-b bg-card'>
            <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
              <Link href='/administration/users' aria-label='JurisMind platform administration home'><Logo className='gap-3' /></Link>
              <div className='flex items-center gap-2 sm:gap-3'>
                <Link href='/workspaces' className='text-sm text-muted-foreground hover:text-foreground'>Workspaces</Link>
                <Link href='/administration/content' className='text-sm text-muted-foreground hover:text-foreground'>Website content</Link>
                <Link href='/administration/lawyer-verifications' className='text-sm text-muted-foreground hover:text-foreground'>Credential reviews</Link>
                <ModeToggle />
                <ProfileDropdown />
              </div>
            </div>
          </header>
          <main className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8'>{children}</main>
        </div>
      </AuthGate>
    </Suspense>
  </AuthProvider>
}

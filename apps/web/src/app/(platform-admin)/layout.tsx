'use client'

import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGate, LoadingState } from '@/components/auth/AuthGate'
import PlatformAdminShell from '@/components/platform-admin/PlatformAdminShell'

export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>
    <Suspense fallback={<LoadingState label='Verifying your platform session…' />}>
      <AuthGate requirePlatformAdmin>
        <PlatformAdminShell>{children}</PlatformAdminShell>
      </AuthGate>
    </Suspense>
  </AuthProvider>
}

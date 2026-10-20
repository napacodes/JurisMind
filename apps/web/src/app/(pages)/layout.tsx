'use client'

// React Imports
import { Suspense } from 'react'
import type { ReactNode } from 'react'

// Component Imports
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGate, LoadingState } from '@/components/auth/AuthGate'

const ProtectedPages = ({ children }: Readonly<{ children: ReactNode }>) => (
  <AuthProvider>
    <Suspense fallback={<LoadingState label='Verifying your JurisMind session…' />}>
      <AuthGate requireWorkspace>
        <div className='flex h-full w-full min-w-0'>
          <Suspense><Sidebar /></Suspense>
          <SidebarInset className='flex flex-1 flex-col'>
            <Header />
            <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>
              <div className='mb-5 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground'>
                <span className='font-medium text-foreground'>Workspace preview.</span> Dashboard records are sample data; no matter or firm data is connected.
              </div>
              {children}
            </main>
            <Footer />
          </SidebarInset>
        </div>
      </AuthGate>
    </Suspense>
  </AuthProvider>
)

const PagesLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return <ProtectedPages>{children}</ProtectedPages>
}

export default PagesLayout

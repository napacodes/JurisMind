import { Suspense } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import WorkspaceSelection from '@/components/auth/WorkspaceSelection'
import { LoadingState } from '@/components/auth/AuthGate'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Choose a workspace | JurisMind', robots: { index: false, follow: false } }

export default function WorkspacesPage() {
  return <AuthProvider><Suspense fallback={<LoadingState label='Loading account…' />}><WorkspaceSelection /></Suspense></AuthProvider>
}

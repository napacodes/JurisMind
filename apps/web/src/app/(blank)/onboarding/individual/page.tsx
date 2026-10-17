import { Suspense } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import IndividualPracticeOnboarding from '@/components/auth/IndividualPracticeOnboarding'
import { LoadingState } from '@/components/auth/AuthGate'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Set up an individual practice | JurisMind', robots: { index: false, follow: false } }

export default function IndividualPracticePage() {
  return <AuthProvider><Suspense fallback={<LoadingState label='Loading account…' />}><IndividualPracticeOnboarding /></Suspense></AuthProvider>
}

import { Suspense } from 'react'
import type { Metadata } from 'next'
import InvitationAcceptance from '@/components/auth/InvitationAcceptance'
import { LoadingState } from '@/components/auth/AuthGate'

export const metadata: Metadata = { title: 'Accept invitation | JurisMind', referrer: 'no-referrer', robots: { index: false, follow: false } }

export default function AcceptInvitationPage() {
  return <Suspense fallback={<LoadingState label='Loading invitation…' />}><InvitationAcceptance /></Suspense>
}

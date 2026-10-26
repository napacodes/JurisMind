import InvitationAcceptance from '@/components/auth/InvitationAcceptance'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Accept assistant invitation | JurisMind', referrer: 'no-referrer', robots: { index: false, follow: false } }
export default function AssistantInvitationPage() { return <InvitationAcceptance /> }

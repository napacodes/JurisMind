import type { Metadata } from 'next'
import MfaSettings from '@/views/security/MfaSettings'

export const metadata: Metadata = { title: 'Two-factor authentication | JurisMind', robots: { index: false, follow: false } }
export default function MfaPage() { return <MfaSettings /> }

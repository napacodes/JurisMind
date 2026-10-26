import type { Metadata } from 'next'
import FirmVerificationPage from '@/views/firm-verification/FirmVerificationPage'

export const metadata: Metadata = { title: 'Firm verification | JurisMind', robots: { index: false, follow: false } }

export default function Page() { return <FirmVerificationPage /> }

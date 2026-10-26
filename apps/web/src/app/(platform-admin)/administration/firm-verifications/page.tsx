import type { Metadata } from 'next'
import PlatformFirmVerificationsPage from '@/views/platform-admin/PlatformFirmVerificationsPage'

export const metadata: Metadata = { title: 'Firm verification review | JurisMind', robots: { index: false, follow: false } }

export default function FirmVerificationsPage() { return <PlatformFirmVerificationsPage /> }

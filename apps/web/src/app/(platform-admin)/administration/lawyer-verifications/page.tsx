import type { Metadata } from 'next'
import PlatformLawyerVerificationsPage from '@/views/platform-admin/PlatformLawyerVerificationsPage'

export const metadata: Metadata = { title: 'Lawyer credential review | JurisMind', robots: { index: false, follow: false } }

export default function LawyerVerificationsPage() {
  return <PlatformLawyerVerificationsPage />
}

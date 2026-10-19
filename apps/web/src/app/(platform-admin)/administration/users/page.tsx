import type { Metadata } from 'next'
import PlatformUsersPage from '@/views/platform-admin/PlatformUsersPage'

export const metadata: Metadata = { title: 'Platform users | JurisMind', robots: { index: false, follow: false } }

export default function AdministrationUsersPage() {
  return <PlatformUsersPage />
}

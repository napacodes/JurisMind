import type { Metadata } from 'next'
import PlatformAdminOverviewPage from '@/views/platform-admin/PlatformAdminOverviewPage'

export const metadata: Metadata = { title: 'Platform overview | JurisMind', robots: { index: false, follow: false } }

export default function AdministrationOverviewRoute() {
  return <PlatformAdminOverviewPage />
}
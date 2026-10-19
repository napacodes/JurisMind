import type { Metadata } from 'next'
import PlatformContentPage from '@/views/platform-admin/PlatformContentPage'

export const metadata: Metadata = { title: 'Website content | JurisMind', robots: { index: false, follow: false } }

export default function AdministrationContentPage() {
  return <PlatformContentPage />
}

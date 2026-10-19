import type { Metadata } from 'next'
import LawyerVerificationPage from '@/views/lawyer-verification/LawyerVerificationPage'

export const metadata: Metadata = { title: 'Lawyer credential verification | JurisMind', robots: { index: false, follow: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ workspaceId?: string | string[] }> }) {
  const values = await searchParams
  const workspaceId = typeof values.workspaceId === 'string' ? values.workspaceId : ''
  return <LawyerVerificationPage workspaceId={workspaceId} />
}

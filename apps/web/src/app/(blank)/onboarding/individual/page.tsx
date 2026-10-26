import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Workspace access | JurisMind', robots: { index: false, follow: false } }

export default function IndividualPracticePage() {
  redirect('/workspaces')
}

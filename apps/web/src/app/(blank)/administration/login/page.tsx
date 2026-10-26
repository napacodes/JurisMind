import Login from '@/views/pages/auth/login'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Platform Admin sign in | JurisMind', robots: { index: false, follow: false } }

export default function AdministrationLoginPage() {
  return <Login audience='administration' returnTo='/administration' />
}

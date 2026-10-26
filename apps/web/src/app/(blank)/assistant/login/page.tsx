import { RoleLoginPage } from '@/views/pages/auth/login/role-login-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Assistant sign in | JurisMind', robots: { index: false, follow: false } }
type Props = { searchParams: Promise<{ returnTo?: string | string[] }> }
export default function AssistantLoginPage({ searchParams }: Props) { return <RoleLoginPage audience='assistant' searchParams={searchParams} /> }

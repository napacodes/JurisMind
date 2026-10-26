import { RoleLoginPage } from '@/views/pages/auth/login/role-login-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Firm sign in | JurisMind', robots: { index: false, follow: false } }
type Props = { searchParams: Promise<{ returnTo?: string | string[] }> }
export default function FirmLoginPage({ searchParams }: Props) { return <RoleLoginPage audience='firm' searchParams={searchParams} /> }

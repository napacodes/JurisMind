import Login from '@/views/pages/auth/login'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in | JurisMind', robots: { index: false, follow: false } }

type PageProps = { searchParams: Promise<{ returnTo?: string | string[] }> }

const LoginPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo
  return <Login returnTo={returnTo} />
}

export default LoginPage

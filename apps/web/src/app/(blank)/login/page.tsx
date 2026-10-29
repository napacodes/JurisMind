import { PublicLoginChoices } from '@/components/auth/PublicLoginChoices'

export default async function PublicLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo
  return <PublicLoginChoices returnTo={returnTo} />
}

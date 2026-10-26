import Login from './index'

export async function RoleLoginPage({ audience, searchParams }: {
  audience: 'firm' | 'lawyer' | 'assistant'
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const params = await searchParams
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo
  return <Login audience={audience} returnTo={returnTo} />
}

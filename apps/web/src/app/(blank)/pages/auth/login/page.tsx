import { redirect } from 'next/navigation'

type PageProps = { searchParams: Promise<{ returnTo?: string | string[] }> }

const LoginPage = async ({ searchParams }: PageProps) => {
  const params = await searchParams
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo
  redirect(`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
}

export default LoginPage

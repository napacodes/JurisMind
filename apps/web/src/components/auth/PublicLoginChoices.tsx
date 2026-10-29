import Link from 'next/link'
import { AuthShell } from './AuthShell'

export function PublicLoginChoices({ returnTo }: { returnTo?: string }) {
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
  return <AuthShell eyebrow='Secure access' title='Choose your sign in' description='Select the account type for your JurisMind workspace.'>
    <div className='space-y-3'>
      <Link href={`/firm/login${returnQuery}`} className='flex min-h-12 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground'>Login as Firm</Link>
      <Link href={`/lawyer/login${returnQuery}`} className='flex min-h-12 items-center justify-center rounded-md border px-4 text-sm font-semibold hover:bg-muted'>Login as Lawyer</Link>
    </div>
    <p className='mt-5 text-center text-sm text-muted-foreground'>Platform administrators can <Link href='/administration/login' className='underline'>sign in here</Link>.</p>
    <p className='mt-4 text-center text-xs text-muted-foreground'><Link href='/' className='underline'>Return to JurisMind</Link></p>
  </AuthShell>
}

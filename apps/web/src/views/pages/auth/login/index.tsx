import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import LoginForm from './login-form'

type Audience = 'firm' | 'lawyer' | 'assistant' | 'administration'

export default function Login({ returnTo = '/workspaces', audience = 'firm' }: { returnTo?: string; audience?: Audience }) {
  const label = audience === 'administration' ? 'Platform administration' : audience === 'assistant' ? 'Assistant access' : audience === 'firm' ? 'Firm access' : 'Lawyer access'
  const title = audience === 'administration' ? 'Platform Admin sign in' : 'Sign in to JurisMind'
  const description = audience === 'administration'
    ? 'Restricted access for platform operators. Your active server-side platform grant determines access to administration tools.'
    : 'Use the account credentials for this sign-in. The server verifies the matching active role before creating a session.'
  const registrationHref = audience === 'firm' ? '/firm/register' : audience === 'lawyer' ? '/lawyer/register' : null
  return (
    <AuthShell eyebrow={label} title={title} description={description} administration={audience === 'administration'}>
      <LoginForm returnTo={returnTo} audience={audience} />
      {registrationHref && <p className='mt-5 text-center text-sm text-slate-400'>New to JurisMind? <Link className='text-teal-200 underline-offset-4 hover:underline' href={registrationHref}>Create an account</Link></p>}
      {audience !== 'administration' && <p className='mt-4 text-center text-sm text-slate-400'>Joining a team? <Link className='text-teal-200 underline-offset-4 hover:underline' href={audience === 'assistant' ? '/assistant/invitations/accept' : '/firm/invitations/accept'}>Accept an invitation</Link></p>}
      {audience === 'administration' && <p className='mt-4 text-center text-sm text-slate-400'>Practice account? <Link className='text-teal-200 underline-offset-4 hover:underline' href='/firm/login'>Sign in to a workspace</Link></p>}
      <p className='mt-4 text-center text-xs text-slate-500'><Link href='/' className='underline-offset-4 hover:underline'>Return to JurisMind</Link></p>
    </AuthShell>
  )
}

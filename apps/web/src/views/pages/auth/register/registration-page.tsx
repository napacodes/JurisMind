import { AuthShell } from '@/components/auth/AuthShell'
import { AccountRegistrationForm } from '@/components/auth/AccountRegistrationForm'

export function RegistrationPage({ kind }: { kind: 'firm' | 'lawyer' }) {
  return <AuthShell eyebrow={kind === 'firm' ? 'Firm registration' : 'Lawyer registration'}
    title={kind === 'firm' ? 'Set up your firm account' : 'Create your lawyer account'}
    description={kind === 'firm'
      ? 'Create the firm workspace and the first Firm Admin account in one secure step.'
      : 'Create your account and individual-practice workspace. Professional credentials are reviewed separately.'}>
    <AccountRegistrationForm kind={kind} />
  </AuthShell>
}

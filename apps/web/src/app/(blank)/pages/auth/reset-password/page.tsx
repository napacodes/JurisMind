import type { Metadata } from 'next'
import ResetPassword from '@/views/pages/auth/reset-password'

export const metadata: Metadata = { title: 'Choose a new password | JurisMind', referrer: 'no-referrer', robots: { index: false, follow: false } }
export default function ResetPasswordPage() { return <ResetPassword /> }

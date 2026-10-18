import type { Metadata } from 'next'
import ForgotPassword from '@/views/pages/auth/forgot-password'

export const metadata: Metadata = { title: 'Reset password | JurisMind', robots: { index: false, follow: false } }
export default function ForgotPasswordPage() { return <ForgotPassword /> }

import { RegistrationPage } from '@/views/pages/auth/register/registration-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lawyer registration | JurisMind', robots: { index: false, follow: false } }
export default function LawyerRegisterPage() { return <RegistrationPage kind='lawyer' /> }

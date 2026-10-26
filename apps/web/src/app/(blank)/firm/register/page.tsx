import { RegistrationPage } from '@/views/pages/auth/register/registration-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Firm registration | JurisMind', robots: { index: false, follow: false } }
export default function FirmRegisterPage() { return <RegistrationPage kind='firm' /> }

import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function AdministrationUsersPage() {
  return <LegalResourcePage resource={legalResources['administration-users']} />
}

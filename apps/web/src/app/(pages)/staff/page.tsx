import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function StaffPage() {
  return <LegalResourcePage resource={legalResources.staff} />
}

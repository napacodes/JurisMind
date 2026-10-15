import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function ReportsPage() {
  return <LegalResourcePage resource={legalResources.reports} />
}

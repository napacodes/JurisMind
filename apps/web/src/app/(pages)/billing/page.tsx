import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function BillingPage() {
  return <LegalResourcePage resource={legalResources.billing} />
}

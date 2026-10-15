import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function MattersPage() {
  return <LegalResourcePage resource={legalResources.matters} />
}

import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function ClientsPage() {
  return <LegalResourcePage resource={legalResources.clients} />
}

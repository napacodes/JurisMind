import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function CommunicationsPage() {
  return <LegalResourcePage resource={legalResources.communications} />
}

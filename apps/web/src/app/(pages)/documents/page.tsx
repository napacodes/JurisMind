import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function DocumentsPage() {
  return <LegalResourcePage resource={legalResources.documents} />
}

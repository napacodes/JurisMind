import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function TimePage() {
  return <LegalResourcePage resource={legalResources.time} />
}

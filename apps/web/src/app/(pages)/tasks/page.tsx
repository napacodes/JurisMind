import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function TasksPage() {
  return <LegalResourcePage resource={legalResources.tasks} />
}

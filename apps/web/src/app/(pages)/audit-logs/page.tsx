import { LegalResourcePage } from '@/components/legal/LegalResourcePage'
import { legalResources } from '@/data/legal-demo'

export default function AuditLogsPage() {
  return <LegalResourcePage resource={legalResources['audit-logs']} />
}

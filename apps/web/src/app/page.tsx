import type { Metadata } from 'next'
import { MarketingHome } from '@/components/marketing/MarketingHome'

export const metadata: Metadata = {
  title: 'JurisMind | Every matter, one legal workspace',
  description:
    'Bring matter management, client relationships, documents, hearings, deadlines, time, billing, and reporting into one legal workspace.',
  openGraph: {
    title: 'JurisMind | Every matter, one legal workspace',
    description:
      'A clearer way to coordinate legal matters, client work, and firm operations.',
    type: 'website',
  },
}

export default function HomePage() {
  return <MarketingHome />
}

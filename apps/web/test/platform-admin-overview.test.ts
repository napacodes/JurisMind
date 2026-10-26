import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { platformAdminNavSections, platformAdminPageTitle } from '../src/configs/platformAdminNavConfig'
import { loadPlatformAdminOverview } from '../src/views/platform-admin/platform-admin-overview-data'

const originalFetch = globalThis.fetch
const originalApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalApiUrl
})

test('overview metrics use real paginated totals and exact account status semantics', async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000/api'
  const requests: URL[] = []
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    requests.push(url)
    const query = url.searchParams
    const status = query.get('status')
    const total = url.pathname.endsWith('/lawyer-verifications') ? 3
      : status === 'ACTIVE' ? 8
        : status === 'DISABLED' ? 2
          : 10
    const payload = url.pathname.endsWith('/lawyer-verifications')
      ? { submissions: [], pagination: { page: 1, pageSize: 1, total, totalPages: total } }
      : { users: [], pagination: { page: 1, pageSize: 1, total, totalPages: total } }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const result = await loadPlatformAdminOverview()

  assert.deepEqual(result, {
    totalAccounts: 10,
    activeAccounts: 8,
    disabledAccounts: 2,
    pendingCredentialReviews: 3,
  })
  assert.equal(requests.length, 4)
  assert.equal(requests.filter((url) => url.pathname.endsWith('/platform-admin/users')).length, 3)
  assert.equal(requests.find((url) => url.pathname.endsWith('/platform-admin/users') && url.searchParams.get('status') === 'ACTIVE')?.searchParams.get('status'), 'ACTIVE')
  assert.equal(requests.find((url) => url.pathname.endsWith('/platform-admin/users') && url.searchParams.get('status') === 'DISABLED')?.searchParams.get('status'), 'DISABLED')
  assert.equal(requests.find((url) => url.pathname.endsWith('/lawyer-verifications'))?.searchParams.get('pageSize'), '1')
})

test('platform navigation links only to implemented routes and names unsupported modules', () => {
  const links = platformAdminNavSections.flatMap((section) => section.items)
    .filter((item) => item.kind === 'link')
    .map((item) => item.href)
  const unavailable = platformAdminNavSections.flatMap((section) => section.items)
    .filter((item) => item.kind === 'unavailable')
    .map((item) => item.label)

  assert.deepEqual(links, [
    '/administration',
    '/administration/users',
    '/administration/firm-verifications',
    '/administration/lawyer-verifications',
    '/administration/content',
  ])
  assert.ok(unavailable.includes('KYC pending users'))
  assert.ok(unavailable.includes('Verification providers'))
  assert.ok(unavailable.includes('Blog categories'))
  assert.equal(platformAdminPageTitle('/administration'), 'Overview')
  assert.equal(platformAdminPageTitle('/administration/content'), 'Website content')
  assert.equal(platformAdminPageTitle('/administration/lawyer-verifications'), 'Pending reviews')
})

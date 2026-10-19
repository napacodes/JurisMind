import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { ApiError, allowedWorkspaceNavigation, api, apiBaseUrl, invitationTokenFromFragment, safeReturnTo } from '../src/lib/api'
import { individualPracticeSchema, loginSchema } from '../src/lib/auth-schemas'
import { resetTokenFromFragment } from '../src/views/pages/auth/reset-password/reset-password-form'
import { platformUserListState, platformUserMutationNotice, platformUserStatusAction } from '../src/views/platform-admin/platform-user-ui-state'

const originalFetch = globalThis.fetch
const originalApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL
  else process.env.NEXT_PUBLIC_API_BASE_URL = originalApiUrl
})

beforeEach(() => { process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000/api' })

test('login and workspace forms validate input bounds and normalize allowed values', () => {
  assert.equal(loginSchema.safeParse({ email: ' lawyer@example.test ', password: 'secret' }).success, true)
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'a@b.test', password: '' }).success, false)
  assert.deepEqual(individualPracticeSchema.parse({ name: '  Cedar Legal  ' }), { name: 'Cedar Legal' })
  assert.equal(individualPracticeSchema.safeParse({ name: '   ' }).success, false)
  assert.equal(individualPracticeSchema.safeParse({ name: 'x'.repeat(201) }).success, false)
})

test('API base URL validation rejects credentials and malformed origins', () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test/v1/'
  assert.equal(apiBaseUrl(), 'https://api.example.test/v1')
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://user:secret@api.example.test/api'
  assert.throws(() => apiBaseUrl())
  process.env.NEXT_PUBLIC_API_BASE_URL = 'not a URL'
  assert.throws(() => apiBaseUrl())
})

test('API calls include browser credentials and do not cache session responses', async () => {
  let seen: RequestInit | undefined
  globalThis.fetch = async (_input, init) => {
    seen = init
    return new Response(JSON.stringify({ user: { id: 'u1', email: 'a@example.test', fullName: 'A User' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
  const response = await api.currentUser()
  assert.equal(response.user.id, 'u1')
  assert.equal(seen?.credentials, 'include')
  assert.equal(seen?.cache, 'no-store')
})

test('platform-user API contracts encode bounded filters and use guarded status mutations', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    return new Response(JSON.stringify({ users: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
  await api.platformUsers({ page: 1, pageSize: 25, search: 'lawyer@example.invalid', role: 'LAWYER', status: 'ACTIVE', workspaceKind: 'FIRM' })
  await api.changePlatformUserStatus('user-id', 'DISABLED')
  assert.equal(requests[0]?.url.includes('/platform-admin/users?'), true)
  const query = new URL(requests[0]!.url).searchParams
  assert.equal(query.get('search'), 'lawyer@example.invalid')
  assert.equal(query.get('role'), 'LAWYER')
  assert.equal(query.get('status'), 'ACTIVE')
  assert.equal(query.get('workspaceKind'), 'FIRM')
  assert.equal(requests[0]?.init?.credentials, 'include')
  assert.equal(requests[1]?.url.endsWith('/platform-admin/users/user-id/status'), true)
  assert.equal(requests[1]?.init?.method, 'PATCH')
  assert.equal(requests[1]?.init?.body, JSON.stringify({ status: 'DISABLED' }))
  assert.ok(new Headers(requests[1]?.init?.headers).get('X-Request-Id'))
})

test('platform-user UI states cover loading, error, empty, results, and protected mutations', () => {
  assert.equal(platformUserListState(true, false, 0), 'loading')
  assert.equal(platformUserListState(false, true, 0), 'error')
  assert.equal(platformUserListState(false, false, 0), 'empty')
  assert.equal(platformUserListState(false, false, 2), 'results')
  assert.deepEqual(platformUserStatusAction('ACTIVE', true), {
    nextStatus: 'DISABLED', label: 'Suspend', disabled: true, reason: 'You cannot disable your own administrator account.',
  })
  assert.deepEqual(platformUserStatusAction('DISABLED', false), {
    nextStatus: 'ACTIVE', label: 'Activate', disabled: false, reason: undefined,
  })
  assert.equal(platformUserMutationNotice('DISABLED', true), 'Account suspended successfully.')
  assert.equal(platformUserMutationNotice('ACTIVE', false), 'Account is already active.')
})

test('login request uses the real endpoint and never interprets server error bodies', async () => {
  let seenUrl = ''
  let seenBody = ''
  globalThis.fetch = async (input, init) => {
    seenUrl = String(input)
    seenBody = String(init?.body)
    return new Response(JSON.stringify({ message: 'database internals must not reach users' }), { status: 401 })
  }
  await assert.rejects(api.login('lawyer@example.test', 'example-password'), (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 401)
    assert.equal(error.message, 'Your session is missing or has expired.')
    assert.equal(error.category, 'unauthorized')
    return true
  })
  assert.equal(seenUrl.endsWith('/auth/login'), true)
  assert.equal(seenBody, JSON.stringify({ email: 'lawyer@example.test', password: 'example-password' }))
})

test('invitation and provisioning calls use credentialed backend contracts and retry keys', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init })
    return new Response(JSON.stringify({ accepted: true, workspaceId: 'workspace-1' }), { status: 200 })
  }
  const token = 'temporary-invitation-token'
  await api.acceptInvitation(token)
  await api.provisionIndividual('Cedar Legal', 'retry-key-123')
  assert.equal(requests[0]?.url.endsWith('/invitations/accept'), true)
  assert.equal(requests[0]?.init?.credentials, 'include')
  assert.equal(requests[0]?.init?.body, JSON.stringify({ token }))
  const provision = requests[1]
  assert.equal(provision?.url.endsWith('/workspaces/individual-practice'), true)
  assert.equal(new Headers(provision?.init?.headers).get('Idempotency-Key'), 'retry-key-123')
  assert.equal(provision?.init?.body, JSON.stringify({ name: 'Cedar Legal' }))
})

test('safe return destinations reject protocol-relative and credential-like redirects', () => {
  assert.equal(safeReturnTo('/dashboard?workspaceId=abc'), '/dashboard?workspaceId=abc')
  assert.equal(safeReturnTo('//evil.example'), '/workspaces')
  assert.equal(safeReturnTo('https://evil.example'), '/workspaces')
  assert.equal(safeReturnTo('/pages/auth/login?returnTo=/dashboard'), '/workspaces')
  assert.equal(safeReturnTo('/\\evil.example'), '/workspaces')
})

test('invitation secrets are read only from URL fragments and require a valid token shape', () => {
  const token = 'A'.repeat(43)
  assert.equal(invitationTokenFromFragment(`#token=${token}`), token)
  assert.equal(invitationTokenFromFragment(`?token=${token}`), null)
  assert.equal(invitationTokenFromFragment('#token=short'), null)
})

test('password-reset tokens are accepted only from a valid URL fragment', () => {
  const token = 'A'.repeat(43)
  assert.equal(resetTokenFromFragment(`#token=${token}`), token)
  assert.equal(resetTokenFromFragment(`?token=${token}`), null)
  assert.equal(resetTokenFromFragment('#token=short'), null)
})

test('navigation requires the backend workspace permission and excludes unsupported matter links', () => {
  assert.deepEqual(allowedWorkspaceNavigation(['workspace:read:metadata']), ['/dashboard'])
  assert.deepEqual(allowedWorkspaceNavigation(['workspace:read:metadata', 'lawyer-credential:submit:self']), ['/dashboard', '/lawyer-verification'])
  assert.deepEqual(allowedWorkspaceNavigation(['lawyer-credential:submit:self']), ['/lawyer-verification'])
  assert.deepEqual(allowedWorkspaceNavigation(['workspace:read:metadata', 'platform:admin']), ['/dashboard'])
  assert.deepEqual(allowedWorkspaceNavigation(['workspace:read:metadata', 'lawyer-credential:review']), ['/dashboard'])
  assert.deepEqual(allowedWorkspaceNavigation(['platform:admin']), [])
  assert.deepEqual(allowedWorkspaceNavigation(['matter:access:lawyer-private']), [])
})

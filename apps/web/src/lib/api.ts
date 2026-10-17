export type PracticeRole = 'FIRM_ADMIN' | 'LAWYER' | 'ASSISTANT'
export type WorkspaceKind = 'FIRM' | 'INDIVIDUAL'

export type CurrentUser = { id: string; email: string; fullName: string }
export type WorkspaceMembership = {
  id: string
  name: string
  slug: string
  kind: WorkspaceKind
  membershipId: string
  role: PracticeRole
  permissions: string[]
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }

  get category(): 'unauthorized' | 'forbidden' | 'conflict' | 'rate-limited' | 'http' {
    if (this.status === 401) return 'unauthorized'
    if (this.status === 403) return 'forbidden'
    if (this.status === 409) return 'conflict'
    if (this.status === 429) return 'rate-limited'
    return 'http'
  }
}

export function apiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!value) throw new Error('NEXT_PUBLIC_API_BASE_URL is required. See apps/web/.env.example.')
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be a valid absolute URL.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) API URL without credentials, query, or fragment.')
  }
  return value.replace(/\/+$/, '')
}

/** Invitation secrets travel in a URL fragment so they are not sent in HTTP requests or referrers. */
export function invitationTokenFromFragment(hash: string): string | null {
  if (!hash.startsWith('#')) return null
  const value = new URLSearchParams(hash.slice(1)).get('token')
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

type RequestOptions = { method?: string; body?: unknown; headers?: HeadersInit; signal?: AbortSignal }

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('The JurisMind service could not be reached. Check your connection and try again.')
  }

  if (!response.ok) {
    const message = response.status === 401 ? 'Your session is missing or has expired.'
      : response.status === 403 ? 'You are not allowed to perform this action.'
        : response.status === 409 ? 'This request conflicts with the current account state.'
          : response.status === 429 ? 'Too many attempts. Wait a moment and try again.'
            : 'The request could not be completed.'
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  try {
    return await response.json() as T
  } catch {
    throw new Error('The JurisMind service returned an invalid response.')
  }
}

function requestHeaders(): HeadersInit {
  return { 'X-Request-Id': crypto.randomUUID() }
}

export const api = {
  login: (email: string, password: string) => apiRequest<{ user: CurrentUser; expiresAt: string }>('/auth/login', {
    method: 'POST', body: { email, password }, headers: requestHeaders(),
  }),
  currentUser: () => apiRequest<{ user: CurrentUser }>('/auth/me'),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', headers: requestHeaders() }),
  workspaces: () => apiRequest<WorkspaceMembership[]>('/workspaces'),
  provisionIndividual: (name: string, idempotencyKey: string) => apiRequest<{
    workspace: { id: string; name: string; slug: string; kind: WorkspaceKind; status: string; createdAt: string }
    membership: { id: string; role: PracticeRole; status: string; joinedAt: string | null }
    lawyerProfile: { id: string; isPrimary: boolean }
  }>('/workspaces/individual-practice', { method: 'POST', body: { name }, headers: {
    ...requestHeaders(), 'Idempotency-Key': idempotencyKey,
  } }),
  acceptInvitation: (token: string) => apiRequest<{ accepted: boolean; workspaceId: string; membershipId: string }>('/invitations/accept', {
    method: 'POST', body: { token }, headers: requestHeaders(),
  }),
}

export function safeReturnTo(value: string | null | undefined, fallback = '/workspaces'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) {
    return fallback
  }
  try {
    const parsed = new URL(value, 'https://jurismind.invalid')
    if (parsed.origin !== 'https://jurismind.invalid') return fallback
    if (parsed.pathname === '/pages/auth/login' || parsed.pathname.startsWith('/pages/auth/login/')) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function allowedWorkspaceNavigation(permissions: readonly string[]) {
  // The existing dashboard is a clearly labelled sample-data preview. No live matter,
  // client, billing, document, or reporting API permissions currently exist.
  return permissions.includes('workspace:read:metadata') ? ['/dashboard'] : []
}

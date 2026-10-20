export type PracticeRole = 'FIRM_ADMIN' | 'LAWYER' | 'ASSISTANT'
export type WorkspaceKind = 'FIRM' | 'INDIVIDUAL'

export type CurrentUser = { id: string; email: string; fullName: string; platformRoles?: string[] }
export type CurrentUserResponse = { user: CurrentUser; platformRoles: string[] }
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

async function apiForm<T>(path: string, body: FormData): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { method: 'POST', credentials: 'include', cache: 'no-store',
      headers: requestHeaders(), body })
  } catch {
    throw new Error('The JurisMind service could not be reached. Check your connection and try again.')
  }
  if (!response.ok) throw new ApiError(response.status, 'The request could not be completed.')
  return await response.json() as T
}

async function apiDocument(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { credentials: 'include', cache: 'no-store' })
  } catch {
    throw new Error('The JurisMind service could not be reached. Check your connection and try again.')
  }
  if (!response.ok) throw new ApiError(response.status, 'The document could not be retrieved.')
  return response.blob()
}

function requestHeaders(): HeadersInit {
  return { 'X-Request-Id': crypto.randomUUID() }
}

export const api = {
  login: (email: string, password: string) => apiRequest<{ user?: CurrentUser; expiresAt?: string; mfaRequired: boolean }>('/auth/login', {
    method: 'POST', body: { email, password }, headers: requestHeaders(),
  }),
  resetRequest: (email: string) => apiRequest<{ message: string }>('/auth/password-reset/request', { method: 'POST', body: { email }, headers: requestHeaders() }),
  resetComplete: (token: string, password: string) => apiRequest<{ reset: true }>('/auth/password-reset/complete', { method: 'POST', body: { token, password }, headers: requestHeaders() }),
  mfaChallenge: (code: string) => apiRequest<{ user: CurrentUser; expiresAt: string }>('/auth/mfa/challenge', { method: 'POST', body: { code }, headers: requestHeaders() }),
  mfaStatus: () => apiRequest<{ enabled: boolean; recoveryCodesRemaining: number }>('/auth/mfa/status'),
  mfaEnrollment: (password: string) => apiRequest<{ secret: string; otpauthUrl: string }>('/auth/mfa/enrollment', { method: 'POST', body: { password }, headers: requestHeaders() }),
  mfaConfirmEnrollment: (code: string) => apiRequest<{ enabled: true; recoveryCodes: string[] }>('/auth/mfa/enrollment/confirm', { method: 'POST', body: { code }, headers: requestHeaders() }),
  mfaDisable: (password: string, code: string) => apiRequest<{ disabled: true }>('/auth/mfa/disable', { method: 'POST', body: { password, code }, headers: requestHeaders() }),
  mfaRegenerateRecoveryCodes: (password: string, code: string) => apiRequest<{ recoveryCodes: string[] }>('/auth/mfa/recovery-codes/regenerate', { method: 'POST', body: { password, code }, headers: requestHeaders() }),
  currentUser: () => apiRequest<CurrentUserResponse>('/auth/me'),
  platformUsers: (query: { page: number; pageSize: number; search?: string; role?: string; status?: string; workspaceKind?: string }) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value))
    return apiRequest<PlatformUserPage>(`/platform-admin/users?${params.toString()}`)
  },
  createPlatformAdmin: (input: { fullName: string; email: string; password: string }) => apiRequest<{
    id: string; email: string; fullName: string; status: 'ACTIVE' | 'DISABLED'; createdAt: string; platformRoles: string[]
  }>('/platform-admin/users', { method: 'POST', body: input, headers: requestHeaders() }),
  platformUser: (userId: string) => apiRequest<PlatformUserDetail>(`/platform-admin/users/${encodeURIComponent(userId)}`),
  changePlatformUserStatus: (userId: string, status: 'ACTIVE' | 'DISABLED') => apiRequest<{ id: string; status: 'ACTIVE' | 'DISABLED'; changed: boolean }>(
    `/platform-admin/users/${encodeURIComponent(userId)}/status`,
    { method: 'PATCH', body: { status }, headers: requestHeaders() },
  ),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', headers: requestHeaders() }),
  workspaces: () => apiRequest<WorkspaceMembership[]>('/workspaces'),
  provisionIndividual: (name: string, idempotencyKey: string) => apiRequest<{
    workspace: { id: string; name: string; slug: string; kind: WorkspaceKind; status: string; createdAt: string }
    membership: { id: string; role: PracticeRole; status: string; joinedAt: string | null }
    lawyerProfile: { id: string; isPrimary: boolean }
  }>('/workspaces/individual-practice', { method: 'POST', body: { name }, headers: {
    ...requestHeaders(), 'Idempotency-Key': idempotencyKey,
  } }),
  lawyerVerification: (workspaceId: string) => apiRequest<LawyerVerificationMine>(`/workspaces/${encodeURIComponent(workspaceId)}/lawyer-verification`),
  submitLawyerVerification: (workspaceId: string, input: { cardHolderName: string; jurisdiction: string; cardIdentifier: string }, document: File) => {
    const body = new FormData()
    body.set('cardHolderName', input.cardHolderName)
    body.set('jurisdiction', input.jurisdiction)
    body.set('cardIdentifier', input.cardIdentifier)
    body.set('document', document)
    return apiForm<LawyerVerificationSubmission>(`/workspaces/${encodeURIComponent(workspaceId)}/lawyer-verification`, body)
  },
  lawyerVerificationDocument: (workspaceId: string, submissionId: string, documentId: string) =>
    apiDocument(`/workspaces/${encodeURIComponent(workspaceId)}/lawyer-verification/${encodeURIComponent(submissionId)}/documents/${encodeURIComponent(documentId)}`),
  pendingLawyerVerifications: (page = 1, pageSize = 25) => apiRequest<LawyerVerificationQueue>(`/platform-admin/lawyer-verifications?page=${page}&pageSize=${pageSize}`),
  platformLawyerVerification: (submissionId: string) => apiRequest<PlatformLawyerVerificationDetail>(`/platform-admin/lawyer-verifications/${encodeURIComponent(submissionId)}`),
  platformLawyerVerificationDocument: (submissionId: string, documentId: string) =>
    apiDocument(`/platform-admin/lawyer-verifications/${encodeURIComponent(submissionId)}/documents/${encodeURIComponent(documentId)}`),
  reviewLawyerVerification: (submissionId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    apiRequest<{ id: string; status: 'APPROVED' | 'REJECTED'; reviewedAt: string }>(`/platform-admin/lawyer-verifications/${encodeURIComponent(submissionId)}/review`, {
      method: 'POST', body: { decision, ...(reason ? { reason } : {}) }, headers: requestHeaders(),
    }),
  platformContent: (page = 1) => apiRequest<ContentPage>(`/platform-admin/content?page=${page}&pageSize=50`),
  createContent: (input: ContentInput) => apiRequest<ContentEntry>('/platform-admin/content', { method: 'POST', body: input, headers: requestHeaders() }),
  updateContent: (id: string, input: ContentInput, expectedUpdatedAt: string) => apiRequest<ContentEntry>(`/platform-admin/content/${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...input, expectedUpdatedAt }, headers: requestHeaders() }),
  previewContent: (id: string) => apiRequest<ContentEntry>(`/platform-admin/content/${encodeURIComponent(id)}/preview`),
  contentAction: (id: string, action: 'publish' | 'unpublish' | 'archive') => apiRequest<ContentEntry>(`/platform-admin/content/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: requestHeaders() }),
  publicContent: (slug: string) => apiRequest<ContentEntry>(`/public/content/${encodeURIComponent(slug)}`),
  acceptInvitation: (token: string) => apiRequest<{ accepted: boolean; workspaceId: string; membershipId: string }>('/invitations/accept', {
    method: 'POST', body: { token }, headers: requestHeaders(),
  }),
}

export type LawyerVerificationSubmission = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  cardIdentifierLast4: string
  createdAt: string
  cardHolderName?: string
  jurisdiction?: string
  reviewReason?: string | null
  reviewedAt?: string | null
  documents?: Array<{ id: string; mediaType: string; sizeBytes: number; createdAt?: string }>
}

export type LawyerVerificationMine = { currentStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'; submissions: LawyerVerificationSubmission[] }
export type LawyerVerificationQueue = {
  submissions: Array<LawyerVerificationSubmission & {
    workspaceId: string
    jurisdiction: string
    membership: { user: { id: string; fullName: string; email: string }; workspace: { id: string; name: string; kind: WorkspaceKind } }
    documents: Array<{ id: string; mediaType: string; sizeBytes: number }>
  }>
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}
export type PlatformLawyerVerificationDetail = LawyerVerificationSubmission & {
  workspaceId: string
  membershipId: string
  jurisdiction: string
  cardIdentifier: string
  reviewReason: string | null
  reviewedAt: string | null
  membership: { user: { id: string; fullName: string; email: string }; workspace: { id: string; name: string; kind: WorkspaceKind } }
  documents: Array<{ id: string; mediaType: string; sizeBytes: number; createdAt: string }>
}

export type PlatformUserSummary = {
  id: string
  email: string
  fullName: string
  status: 'ACTIVE' | 'DISABLED'
  emailVerifiedAt: string | null
  createdAt: string
  platformRoles: string[]
  practiceMemberships: Array<{ role: string; workspace: { id: string; name: string; kind: WorkspaceKind } }>
}

export type PlatformUserPage = {
  users: PlatformUserSummary[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export type PlatformUserDetail = Omit<PlatformUserSummary, 'practiceMemberships'> & {
  updatedAt: string
  platformRoles: string[]
  memberships: Array<{
    id: string
    role: string
    status: string
    joinedAt: string | null
    workspace: { id: string; name: string; kind: WorkspaceKind; status: string }
  }>
}

export type ContentEntry = {
  id: string; type: 'BLOG_POST' | 'INFORMATIONAL_PAGE'; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  slug: string; title: string; summary: string; body: string; seoTitle: string | null; seoDescription: string | null
  publishedAt: string | null; createdAt: string; updatedAt: string
}
export type ContentInput = Pick<ContentEntry, 'type' | 'slug' | 'title' | 'summary' | 'body' | 'seoTitle' | 'seoDescription'>
export type ContentPage = { entries: Array<Omit<ContentEntry, 'body' | 'seoTitle' | 'seoDescription'>>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }

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

export function preferredPostLoginDestination(current: CurrentUserResponse | null | undefined, value: string | null | undefined): string {
  const safe = safeReturnTo(value, '/workspaces')
  if (!current?.platformRoles.includes('SUPER_ADMIN')) return safe
  if (safe === '/administration/users' || safe.startsWith('/administration/')) return safe
  return '/administration/users'
}

export function allowedWorkspaceNavigation(permissions: readonly string[]) {
  // The existing dashboard is a clearly labelled sample-data preview. No live matter,
  // client, billing, document, or reporting API permissions currently exist.
  const routes: string[] = []
  if (permissions.includes('workspace:read:metadata')) routes.push('/dashboard')
  if (permissions.includes('lawyer-credential:submit:self')) routes.push('/lawyer-verification')
  return routes
}

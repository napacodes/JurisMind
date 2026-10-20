import { api } from '@/lib/api'

export type PlatformAdminOverviewMetrics = {
  totalAccounts: number
  activeAccounts: number
  disabledAccounts: number
  pendingCredentialReviews: number
}

export async function loadPlatformAdminOverview(): Promise<PlatformAdminOverviewMetrics> {
  const [allUsers, activeUsers, disabledUsers, pendingReviews] = await Promise.all([
    api.platformUsers({ page: 1, pageSize: 1 }),
    api.platformUsers({ page: 1, pageSize: 1, status: 'ACTIVE' }),
    api.platformUsers({ page: 1, pageSize: 1, status: 'DISABLED' }),
    api.pendingLawyerVerifications(1, 1),
  ])

  return {
    totalAccounts: allUsers.pagination.total,
    activeAccounts: activeUsers.pagination.total,
    disabledAccounts: disabledUsers.pagination.total,
    pendingCredentialReviews: pendingReviews.pagination.total,
  }
}
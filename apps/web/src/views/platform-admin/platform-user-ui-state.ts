export type PlatformUserListState = 'loading' | 'error' | 'empty' | 'results'
export type PlatformAccountStatus = 'ACTIVE' | 'DISABLED'

export function platformUserListState(loading: boolean, hasError: boolean, count: number): PlatformUserListState {
  if (loading) return 'loading'
  if (hasError) return 'error'
  return count === 0 ? 'empty' : 'results'
}

export function platformUserStatusAction(status: PlatformAccountStatus, isCurrentUser: boolean) {
  const nextStatus = status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  return {
    nextStatus,
    label: status === 'ACTIVE' ? 'Suspend' : 'Activate',
    disabled: status === 'ACTIVE' && isCurrentUser,
    reason: status === 'ACTIVE' && isCurrentUser ? 'You cannot disable your own administrator account.' : undefined,
  } as const
}

export function platformUserMutationNotice(status: PlatformAccountStatus, changed: boolean): string {
  if (!changed) return `Account is already ${status === 'ACTIVE' ? 'active' : 'suspended'}.`
  return `Account ${status === 'ACTIVE' ? 'activated' : 'suspended'} successfully.`
}

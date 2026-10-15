// Type Imports
import type { UserFilters, UserPlan, UserRole, UserStatus } from '@/types/apps/user-types'

// Component Imports
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROLES: UserRole[] = ['Admin', 'Editor', 'Subscriber', 'Maintainer', 'Guest']
const PLANS: UserPlan[] = ['Basic', 'Team', 'Enterprise']
const STATUSES: UserStatus[] = ['Active', 'Pending', 'Suspended', 'Inactive']

const ROLE_ITEMS = [{ label: 'All', value: 'all' }, ...ROLES.map(role => ({ label: role, value: role }))]
const PLAN_ITEMS = [{ label: 'All', value: 'all' }, ...PLANS.map(plan => ({ label: plan, value: plan }))]
const STATUS_ITEMS = [{ label: 'All', value: 'all' }, ...STATUSES.map(status => ({ label: status, value: status }))]

export interface UserTableFiltersProps {
  filters: UserFilters
  onFilterChange: (filters: Partial<UserFilters>) => void
}

export function UserTableFilters({ filters, onFilterChange }: UserTableFiltersProps) {
  return (
    <div className='flex flex-col gap-4 border-b p-6'>
      <div className='grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3'>
        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-role'>Select Role</Label>
          <Select
            items={ROLE_ITEMS}
            value={filters.role}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ role: value as UserFilters['role'] })
              }
            }}
          >
            <SelectTrigger id='filter-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>All</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-plan'>Select Plan</Label>
          <Select
            items={PLAN_ITEMS}
            value={filters.plan}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ plan: value as UserFilters['plan'] })
              }
            }}
          >
            <SelectTrigger id='filter-plan' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>All</SelectItem>
                {PLANS.map(plan => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-status'>Select Status</Label>
          <Select
            items={STATUS_ITEMS}
            value={filters.status}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ status: value as UserFilters['status'] })
              }
            }}
          >
            <SelectTrigger id='filter-status' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>All</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

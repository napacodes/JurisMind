// Type Imports
import type { AppUser } from '@/types/apps/user-types'

// Component Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountTab } from './tabs/account-tab'
import { BillingTab } from './tabs/billing-tab'
import { ConnectionsTab } from './tabs/connections-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { SecurityTab } from './tabs/security-tab'

export interface UserViewTabsProps {
  user: AppUser
}

export function UserViewTabs({ user }: UserViewTabsProps) {
  return (
    <Tabs defaultValue='account' className='flex-1 justify-between gap-6'>
      <div className='overflow-x-auto'>
        <TabsList className='w-max min-w-full **:group-data-[orientation=horizontal]/tabs:after:h-0'>
          <TabsTrigger value='account'>Account</TabsTrigger>
          <TabsTrigger value='security'>Security</TabsTrigger>
          <TabsTrigger value='billing'>Billing & Plans</TabsTrigger>
          <TabsTrigger value='notifications'>Notifications</TabsTrigger>
          <TabsTrigger value='connections'>Connections</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value='account'>
        <AccountTab user={user} />
      </TabsContent>
      <TabsContent value='security'>
        <SecurityTab user={user} />
      </TabsContent>
      <TabsContent value='billing'>
        <BillingTab user={user} />
      </TabsContent>
      <TabsContent value='notifications'>
        <NotificationsTab user={user} />
      </TabsContent>
      <TabsContent value='connections'>
        <ConnectionsTab user={user} />
      </TabsContent>
    </Tabs>
  )
}

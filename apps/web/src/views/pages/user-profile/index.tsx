// React Imports
import { Suspense } from 'react'

// Third-party Imports
import { BriefcaseBusinessIcon, CalendarDaysIcon, MapPinIcon, UserRoundCheckIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { BackgroundRippleEffect } from '@/components/ui/background-ripple'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import UserProfileTabs from '@/views/pages/user-profile/user-profile-tabs'

const UserProfile = () => {
  return (
    <div>
      <div className='mb-4 md:mb-6 lg:mb-10'>
        <Card className='py-0 pb-6'>
          <div className='bg-muted relative h-44 overflow-hidden'>
            <div className='absolute inset-0'>
              <BackgroundRippleEffect cellSize={45} rows={8} activeSquares={18} cols={45} />
            </div>
          </div>

          <CardContent>
            <div className='flex items-end gap-4 pb-1 max-md:flex-col max-md:items-center md:flex-nowrap md:gap-6'>
              <Avatar className='ring-card z-3 -mt-12 size-28 rounded-md ring-4 after:rounded-[inherit] md:-mt-14'>
                <AvatarImage src='/images/avatars/avatar-1.webp' alt='John Doe' className='rounded-[inherit]' />
              </Avatar>

              <div className='min-w-0 flex-1 space-y-2 text-center md:text-left'>
                <h2 className='text-2xl font-medium'>John Doe</h2>
                <div className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 max-md:justify-center'>
                  <span className='inline-flex items-center gap-2'>
                    <BriefcaseBusinessIcon className='size-4.5' />
                    UX Designer
                  </span>
                  <span className='inline-flex items-center gap-2'>
                    <MapPinIcon className='size-4.5' />
                    India
                  </span>
                  <span className='inline-flex items-center gap-2'>
                    <CalendarDaysIcon className='size-4.5' />
                    April 2021
                  </span>
                </div>
              </div>

              <Button className='md:ml-auto md:self-end'>
                <UserRoundCheckIcon className='size-4' />
                Connected
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Suspense>
        <UserProfileTabs />
      </Suspense>
    </div>
  )
}

export default UserProfile

'use client'

// Next Imports
import { Fragment } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Third-party Imports

// Component Imports
import ModeToggle from '@/components/layout/ModeToggle'
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/components/auth/AuthProvider'

const Header = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { workspaces } = useAuth()
  const selectedId = searchParams.get('workspaceId')
  const selectedWorkspace = workspaces.find(workspace => workspace.id === selectedId) ?? workspaces[0]

  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className='bg-card sticky top-0 z-50 border-b'>
      <div className='mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6'>
        <div className='flex items-center gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' />
          <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden sm:block'>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1
                const label = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const href = '/' + segments.slice(0, index + 1).join('/')

                return (
                  <Fragment key={href}>
                    <BreadcrumbItem>
                      {isLast ? <BreadcrumbPage>{label}</BreadcrumbPage> : <BreadcrumbLink>{label}</BreadcrumbLink>}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-1.5'>
          {selectedWorkspace && workspaces.length > 1 && <label className='sr-only' htmlFor='active-workspace'>Active workspace</label>}
          {selectedWorkspace && workspaces.length > 1 && <select id='active-workspace' aria-label='Workspace context'
            value={selectedWorkspace.id} onChange={event => router.replace(`/dashboard?workspaceId=${encodeURIComponent(event.target.value)}`)}
            className='h-9 max-w-36 rounded-md border bg-background px-2 text-xs sm:max-w-52 sm:text-sm'>
            {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.kind === 'FIRM' ? 'Firm' : 'Individual'}</option>)}
          </select>}
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header

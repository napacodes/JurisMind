'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { platformAdminNavSections, platformAdminPageTitle, type PlatformAdminNavItem } from '@/configs/platformAdminNavConfig'
import Logo from '@/components/shared/Logo'
import ModeToggle from '@/components/layout/ModeToggle'
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import styles from './PlatformAdminShell.module.css'

function UnavailableItem({ item }: { item: Extract<PlatformAdminNavItem, { kind: 'unavailable' }> }) {
  return (
    <SidebarMenuSubItem>
      <div
        aria-disabled='true'
        className='flex h-7 min-w-0 cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/50'
        title={item.note ?? 'This administration area is not available yet.'}
      >
        <span className='min-w-0 truncate'>{item.label}</span>
        <Badge variant='outline' className='h-4 shrink-0 rounded-sm border-sidebar-border/80 px-1 text-[9px] font-normal text-sidebar-foreground/55'>
          Soon
        </Badge>
      </div>
    </SidebarMenuSubItem>
  )
}

function PlatformAdminSidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  return (
    <Sidebar
      collapsible='icon'
      variant='sidebar'
      className={`${styles.sidebar} border-r border-sidebar-border`}
    >
      <SidebarHeader className='gap-1 px-3 py-3'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              tooltip='JurisMind administration'
              className='h-11 gap-2.5 rounded-md bg-transparent! px-2 text-sidebar-foreground hover:bg-sidebar-accent!'
              render={<Link href='/administration' aria-label='JurisMind administration overview' />}
            >
              <Logo className='gap-2 [&_svg]:size-7' />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className='mt-1 flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-2.5 py-1.5 text-[11px] font-medium text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden'>
          <ShieldCheck className='size-3.5 text-sidebar-primary' aria-hidden='true' />
          <span>Platform administration</span>
        </div>
      </SidebarHeader>

      <SidebarContent className='gap-1 px-1 pb-2 group-data-[collapsible=icon]:overflow-y-auto'>
        {platformAdminNavSections.map((section) => {
          const SectionIcon = section.icon
          const active = section.items.some((item) => item.kind === 'link' && item.href === pathname)
          const collapsible = section.collapsible !== false
          const open = active || (openGroups[section.id] ?? false)
          const repeatedSingleHeading = section.items.length === 1
            && section.items[0]?.kind === 'unavailable'
            && section.items[0].label === section.label

          return (
            <SidebarGroup key={section.id} className='px-2 py-1'>
              {collapsible ? (
                <Collapsible
                  open={open}
                  onOpenChange={(nextOpen) => setOpenGroups((current) => ({ ...current, [section.id]: nextOpen }))}
                  className='group/admin-nav'
                >
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton
                            isActive={active}
                            tooltip={section.label}
                            className='h-9 rounded-md data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground'
                            aria-label={`${section.label} navigation group`}
                          />
                        }
                      >
                        <SectionIcon aria-hidden='true' />
                        <span className='min-w-0 flex-1 truncate'>{section.label}</span>
                        <ChevronRight className='ml-auto size-4 transition-transform group-data-open/admin-nav:rotate-90' aria-hidden='true' />
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-all data-ending-style:h-0 data-starting-style:h-0'>
                    <SidebarMenuSub className='mx-3 border-sidebar-border/80 pl-2.5'>
                      {section.items.map((item) => item.kind === 'link' ? (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            render={<Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? 'page' : undefined} />}
                            isActive={pathname === item.href}
                            className='h-8 rounded-md px-2.5 text-[13px] data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground'
                          >
                            <span className='min-w-0 truncate'>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ) : <UnavailableItem key={item.label} item={item} />)}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  {!repeatedSingleHeading && <SidebarGroupLabel className='h-7 px-2 text-[10px] font-semibold text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden'>
                    {section.label}
                  </SidebarGroupLabel>}
                  <SidebarMenu>
                    {section.items.map((item) => item.kind === 'link' ? (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? 'page' : undefined} />}
                          isActive={pathname === item.href}
                          tooltip={item.label}
                          className={cn('h-9 rounded-md data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground', active && 'font-medium')}
                        >
                          <SectionIcon aria-hidden='true' />
                          <span className='min-w-0 truncate'>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      <SidebarMenuItem key={item.label}>
                        <div aria-disabled='true' className='flex h-8 cursor-not-allowed items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/45'>
                          <SectionIcon className='size-4 shrink-0' aria-hidden='true' />
                          <span className='min-w-0 flex-1 truncate'>{item.label}</span>
                          <Badge variant='outline' className='h-4 rounded-sm border-sidebar-border/80 px-1 text-[9px] font-normal text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden'>Soon</Badge>
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </>
              )}
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border/70 px-3 py-3 group-data-[collapsible=icon]:hidden'>
        <p className='px-2 text-[10px] text-sidebar-foreground/45'>JurisMind platform controls</p>
      </SidebarFooter>
    </Sidebar>
  )
}

function PlatformAdminHeader() {
  const pathname = usePathname()
  const title = platformAdminPageTitle(pathname)

  return (
    <header className='sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-6'>
      <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
        <SidebarTrigger aria-label='Toggle administration navigation' className='size-9 shrink-0' />
        <span className='h-5 w-px bg-border' aria-hidden='true' />
        <Breadcrumb className='min-w-0'>
          <BreadcrumbList className='flex-nowrap overflow-hidden text-xs sm:text-sm'>
            <BreadcrumbItem className='shrink-0'>
              {title === 'Overview' ? <BreadcrumbPage>Platform admin</BreadcrumbPage> : <BreadcrumbLink href='/administration'>Platform admin</BreadcrumbLink>}
            </BreadcrumbItem>
            {title !== 'Overview' && <>
              <BreadcrumbSeparator />
              <BreadcrumbItem className='min-w-0 truncate'>
                <BreadcrumbPage className='truncate'>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <ModeToggle />
        <ProfileDropdown />
      </div>
    </header>
  )
}

export default function PlatformAdminShell({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-svh w-full min-w-0'>
      <PlatformAdminSidebar />
      <SidebarInset className='min-h-svh min-w-0'>
        <PlatformAdminHeader />
        <div className='mx-auto w-full max-w-screen-2xl flex-1 px-4 py-5 sm:px-6 sm:py-7'>
          {children}
        </div>
      </SidebarInset>
    </div>
  )
}